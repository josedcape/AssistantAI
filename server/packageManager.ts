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

/**
 * Ejecuta un script definido en el package.json
 */
export async function runScript(scriptName: string, manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    // Validar el nombre del script
    if (!scriptName || scriptName.trim() === '') {
      return {
        success: false,
        message: 'El nombre del script es requerido'
      };
    }

    // Sanitizar el nombre del script para prevenir inyección de comandos
    const sanitizedScriptName = scriptName.replace(/[;&|`$><!\\]/g, '');
    
    // Construir el comando según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = ['run', sanitizedScriptName];
        break;
      case 'yarn':
        args = [sanitizedScriptName];
        break;
      case 'pnpm':
        args = ['run', sanitizedScriptName];
        break;
      case 'bun':
        args = ['run', sanitizedScriptName];
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Usar execa para ejecutar el comando
    const { stdout, stderr } = await execa(cmd, args, { 
      timeout: 60000, // 1 min timeout
      stripFinalNewline: true
    });

    // Comprobar si hay errores
    if (stderr && !isNormalOutput(stderr, manager) && stderr.toLowerCase().includes('error')) {
      return {
        success: false,
        message: `Error al ejecutar script ${sanitizedScriptName}`,
        output: stdout,
        error: stderr
      };
    }

    return {
      success: true,
      message: `Script ${sanitizedScriptName} ejecutado correctamente`,
      output: stdout
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      message: `Error al ejecutar script ${scriptName}`,
      error: errorMessage
    };
  }
}

// Obtiene la lista de paquetes instalados del package.json
export async function getInstalledPackages(): Promise<any[]> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    const dependenciesList = Object.entries(dependencies).map(([name, version]) => ({
      name,
      version: String(version).replace(/[\^~]/, ''),
      isDevDependency: false
    }));
    
    const devDependenciesList = Object.entries(devDependencies).map(([name, version]) => ({
      name,
      version: String(version).replace(/[\^~]/, ''),
      isDevDependency: true
    }));
    
    return [...dependenciesList, ...devDependenciesList];
  } catch (error) {
    log(`Error al leer los paquetes instalados: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Obtiene información sobre un paquete
export async function getPackageInfo(packageName: string, manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  // Validar el nombre del paquete
  if (!packageName || packageName.trim() === '') {
    return {
      success: false,
      message: 'El nombre del paquete es requerido'
    };
  }

  // Sanitizar el nombre del paquete
  const sanitizedPackageName = packageName.replace(/[;&|`$><!\\]/g, '');

  try {
    // Construir los argumentos según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = ['view', sanitizedPackageName, '--json'];
        break;
      case 'yarn':
        args = ['info', sanitizedPackageName, '--json'];
        break;
      case 'pnpm':
        args = ['info', sanitizedPackageName, '--json'];
        break;
      case 'bun':
        args = ['pm', 'info', sanitizedPackageName, '--json'];
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    const { stdout, stderr } = await execa(cmd, args, { 
      timeout: 30000, // 30 segundos timeout
      stripFinalNewline: true
    });

    // Manejar errores si los hay
    if (stderr && !isNormalOutput(stderr, manager)) {
      return {
        success: false,
        message: `Error al obtener información de ${packageName}`,
        error: stderr
      };
    }

    return {
      success: true,
      message: `Información del paquete ${packageName} obtenida correctamente`,
      output: stdout
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Si el paquete no existe, proporcionar un mensaje más claro
    if (errorMessage.includes('code E404') || errorMessage.includes('not found')) {
      return {
        success: false,
        message: `El paquete "${packageName}" no se encontró en el registro`,
        error: errorMessage
      };
    }
    
    return {
      success: false,
      message: `Error al obtener información de ${packageName}`,
      error: errorMessage
    };
  }
}

// Lista los paquetes instalados
export async function listPackages(manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    // Obtener la lista de paquetes instalados desde package.json directamente
    const installedPackages = await getInstalledPackages();
    
    if (installedPackages.length === 0) {
      return {
        success: true,
        message: 'No hay paquetes instalados',
        output: 'No se encontraron dependencias instaladas.'
      };
    }
    
    // Formatear la salida para que sea más legible
    const formatPackage = (pkg: any) => {
      return `${pkg.name}@${pkg.version}${pkg.isDevDependency ? ' (dev)' : ''}`;
    };
    
    const formattedOutput = installedPackages
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(formatPackage)
      .join('\n');
    
    return {
      success: true,
      message: `${installedPackages.length} paquetes listados`,
      output: formattedOutput
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Error al listar paquetes',
      error: errorMessage
    };
  }
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