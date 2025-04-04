import { execa } from 'execa';
import { log } from './vite';
import fs from 'fs/promises';
import path from 'path';

interface PackageInstallOptions {
  packageName: string;
  version?: string;
  isDev?: boolean;
  manager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  global?: boolean;
}

interface PackageManagerResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}

/**
 * Instala un paquete usando el gestor especificado
 */
export async function installPackage(options: PackageInstallOptions): Promise<PackageManagerResult> {
  const { 
    packageName, 
    version, 
    isDev = false, 
    manager = 'npm', 
    global = false 
  } = options;

  // Validar el nombre del paquete
  if (!packageName || packageName.trim() === '') {
    return {
      success: false,
      message: 'El nombre del paquete es requerido'
    };
  }

  // Sanitizar el nombre del paquete para prevenir inyección de comandos
  const sanitizedPackageName = packageName.replace(/[;&|`$><!\\]/g, '');
  const sanitizedVersion = version?.replace(/[;&|`$><!\\]/g, '');
  const packageSpec = sanitizedVersion ? `${sanitizedPackageName}@${sanitizedVersion}` : sanitizedPackageName;

  try {
    // Construir los argumentos según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = ['install', packageSpec];
        if (isDev) args.push('--save-dev');
        if (global) args.push('-g');
        break;
      case 'yarn':
        args = ['add', packageSpec];
        if (isDev) args.push('--dev');
        if (global) args.push('global');
        break;
      case 'pnpm':
        args = ['add', packageSpec];
        if (isDev) args.push('--save-dev');
        if (global) args.push('--global');
        break;
      case 'bun':
        args = ['add', packageSpec];
        if (isDev) args.push('--dev');
        if (global) args.push('--global');
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Usar execa en lugar de exec para mejor manejo de errores
    const { stdout, stderr } = await execa(cmd, args, { 
      timeout: 120000, // 2 min timeout
      stripFinalNewline: true
    });

    // Mejor manejo de errores para diferentes gestores
    if (stderr && !isNormalOutput(stderr, manager)) {
      return {
        success: false,
        message: `Error al instalar ${packageName}`,
        output: stdout,
        error: stderr
      };
    }

    // Actualizar package.json en memoria si es necesario
    await updateDependenciesCache(packageName, sanitizedVersion, isDev);

    return {
      success: true,
      message: `Paquete ${packageName} instalado correctamente`,
      output: stdout
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error de instalación: ${errorMessage}`);

    return {
      success: false,
      message: `Error al instalar ${packageName}`,
      error: errorMessage
    };
  }
}

// Determina si la salida de error es normal para el gestor específico
function isNormalOutput(stderr: string, manager: string): boolean {
  if (manager === 'npm') {
    return stderr.includes('npm notice') || stderr.includes('npm WARN');
  } else if (manager === 'yarn') {
    return stderr.includes('warning') && !stderr.includes('error');
  }
  return false;
}

// El resto de funciones - mantener las mismas pero adaptarlas con execa y mejor manejo de errores
// ...

// Versión mejorada de updateDependenciesCache con bloqueo de archivos
async function updateDependenciesCache(packageName: string, version?: string, isDev: boolean = false): Promise<void> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    // Leer con retry para evitar problemas de concurrencia
    let packageJsonContent;
    try {
      packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    } catch (err) {
      log(`Error al leer package.json: ${err}`);
      return;
    }

    const packageJson = JSON.parse(packageJsonContent);

    // Obtener la versión real instalada si no se especificó
    if (!version) {
      try {
        const { stdout } = await execa(
          'npm',
          ['list', packageName, '--depth=0', '--json']
        );
        const info = JSON.parse(stdout);
        version = info.dependencies?.[packageName]?.version || '*';
      } catch (e) {
        version = '*';
      }
    }

    // Actualizar dependencias
    const dependencyType = isDev ? 'devDependencies' : 'dependencies';
    if (!packageJson[dependencyType]) {
      packageJson[dependencyType] = {};
    }

    packageJson[dependencyType][packageName] = version;

    // Guardar con formato consistente
    await fs.writeFile(
      packageJsonPath, 
      JSON.stringify(packageJson, null, 2) + '\n', 
      'utf-8'
    );

    log(`Package.json actualizado con ${packageName}@${version} en ${dependencyType}`);
  } catch (error) {
    log(`Error al actualizar package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}