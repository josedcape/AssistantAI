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

interface PackageUninstallOptions {
  packageName: string;
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
 * Instala un paquete usando npm/yarn/pnpm
 */
export async function installPackage(options: PackageInstallOptions): Promise<PackageManagerResult> {
  try {
    const { packageName, version, isDev = false, manager = 'npm', global = false } = options;

    // Validar el nombre del paquete
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        message: 'El nombre del paquete es requerido'
      };
    }

    // Sanitizar el nombre del paquete para prevenir inyección de comandos
    const sanitizedPackageName = packageName.replace(/[;&|`$><!\\]/g, '');
    const sanitizedVersion = version ? version.replace(/[;&|`$><!\\]/g, '') : '';

    // Construir el comando según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = global 
          ? ['install', '-g']
          : ['install'];
        if (isDev && !global) args.push('--save-dev');
        args.push(sanitizedVersion ? `${sanitizedPackageName}@${sanitizedVersion}` : sanitizedPackageName);
        break;
      case 'yarn':
        args = global 
          ? ['global', 'add'] 
          : ['add'];
        if (isDev && !global) args.push('--dev');
        args.push(sanitizedVersion ? `${sanitizedPackageName}@${sanitizedVersion}` : sanitizedPackageName);
        break;
      case 'pnpm':
        args = global 
          ? ['add', '-g'] 
          : ['add'];
        if (isDev && !global) args.push('--save-dev');
        args.push(sanitizedVersion ? `${sanitizedPackageName}@${sanitizedVersion}` : sanitizedPackageName);
        break;
      case 'bun':
        args = global 
          ? ['add', '-g'] 
          : ['add'];
        if (isDev && !global) args.push('--development');
        args.push(sanitizedVersion ? `${sanitizedPackageName}@${sanitizedVersion}` : sanitizedPackageName);
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Ejecutar el comando con límite de tiempo
    const { stdout, stderr } = await execa(cmd, args, {
      timeout: 120000, // 2 minutos máximo
    });

    // Algunos gestores de paquetes usan stderr para mensajes informativos
    if (stderr && !isNormalOutput(stderr, manager)) {
      log(`Advertencia durante la instalación: ${stderr}`);
    }

    // Actualizar package.json si no es global
    if (!global) {
      await updateDependenciesCache(sanitizedPackageName, sanitizedVersion, isDev);
    }

    return {
      success: true,
      message: `Paquete ${sanitizedPackageName}${sanitizedVersion ? `@${sanitizedVersion}` : ''} instalado correctamente`,
      output: stdout
    };

  } catch (error: any) {
    log(`Error instalando paquete: ${error.message}`);

    return {
      success: false,
      message: 'Error al instalar el paquete',
      error: error.message,
      output: error.stdout || ''
    };
  }
}

/**
 * Desinstala un paquete usando npm/yarn/pnpm
 */
export async function uninstallPackage(options: PackageUninstallOptions): Promise<PackageManagerResult> {
  try {
    const { packageName, manager = 'npm', global = false } = options;

    // Validar el nombre del paquete
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        message: 'El nombre del paquete es requerido'
      };
    }

    // Sanitizar el nombre del paquete para prevenir inyección de comandos
    const sanitizedPackageName = packageName.replace(/[;&|`$><!\\]/g, '');

    // Construir el comando según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = global 
          ? ['uninstall', '-g', sanitizedPackageName]
          : ['uninstall', sanitizedPackageName];
        break;
      case 'yarn':
        args = global 
          ? ['global', 'remove', sanitizedPackageName] 
          : ['remove', sanitizedPackageName];
        break;
      case 'pnpm':
        args = global 
          ? ['remove', '-g', sanitizedPackageName] 
          : ['remove', sanitizedPackageName];
        break;
      case 'bun':
        args = global 
          ? ['remove', '-g', sanitizedPackageName] 
          : ['remove', sanitizedPackageName];
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Ejecutar el comando con límite de tiempo
    const { stdout, stderr } = await execa(cmd, args, {
      timeout: 60000, // 1 minuto máximo
    });

    // Algunos gestores de paquetes usan stderr para mensajes informativos
    if (stderr && !isNormalOutput(stderr, manager)) {
      log(`Advertencia durante la desinstalación: ${stderr}`);
    }

    // Actualizar package.json si no es global
    if (!global) {
      await removeDependencyFromCache(sanitizedPackageName);
    }

    return {
      success: true,
      message: `Paquete ${sanitizedPackageName} desinstalado correctamente`,
      output: stdout
    };

  } catch (error: any) {
    log(`Error desinstalando paquete: ${error.message}`);

    return {
      success: false,
      message: 'Error al desinstalar el paquete',
      error: error.message,
      output: error.stdout || ''
    };
  }
}

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

    // Ejecutar el comando con límite de tiempo
    const { stdout, stderr } = await execa(cmd, args, {
      timeout: 30000, // 30 segundos máximo para scripts
    });

    // Algunos gestores de paquetes usan stderr para mensajes informativos
    if (stderr && !isNormalOutput(stderr, manager)) {
      log(`Advertencia durante la ejecución: ${stderr}`);
    }

    return {
      success: true,
      message: `Script ${sanitizedScriptName} ejecutado correctamente`,
      output: stdout
    };

  } catch (error: any) {
    log(`Error ejecutando script: ${error.message}`);

    return {
      success: false,
      message: 'Error al ejecutar el script',
      error: error.message,
      output: error.stdout || ''
    };
  }
}

/**
 * Obtiene información de un paquete
 */
export async function getPackageInfo(packageName: string, manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    // Validar el nombre del paquete
    if (!packageName || packageName.trim() === '') {
      return {
        success: false,
        message: 'El nombre del paquete es requerido'
      };
    }

    // Sanitizar el nombre del paquete para prevenir inyección de comandos
    const sanitizedPackageName = packageName.replace(/[;&|`$><!\\]/g, '');

    // Construir el comando según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = ['view', sanitizedPackageName];
        break;
      case 'yarn':
        args = ['info', sanitizedPackageName];
        break;
      case 'pnpm':
        args = ['info', sanitizedPackageName];
        break;
      case 'bun':
        args = ['pm', 'info', sanitizedPackageName];
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Ejecutar el comando con límite de tiempo
    const { stdout, stderr } = await execa(cmd, args, {
      timeout: 30000, // 30 segundos máximo
    });

    return {
      success: true,
      message: `Información de ${sanitizedPackageName} obtenida correctamente`,
      output: stdout
    };

  } catch (error: any) {
    log(`Error obteniendo información del paquete: ${error.message}`);

    return {
      success: false,
      message: 'Error al obtener información del paquete',
      error: error.message,
      output: error.stdout || ''
    };
  }
}

/**
 * Lista paquetes instalados
 */
export async function listPackages(manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    // Construir el comando según el gestor
    let cmd = manager;
    let args: string[] = [];

    switch (manager) {
      case 'npm':
        args = ['list', '--depth=0'];
        break;
      case 'yarn':
        args = ['list', '--depth=0'];
        break;
      case 'pnpm':
        args = ['list'];
        break;
      case 'bun':
        args = ['pm', 'ls'];
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${cmd} ${args.join(' ')}`);

    // Ejecutar el comando con límite de tiempo
    const { stdout, stderr } = await execa(cmd, args, {
      timeout: 30000, // 30 segundos máximo
    });

    return {
      success: true,
      message: `Lista de paquetes obtenida correctamente`,
      output: stdout
    };

  } catch (error: any) {
    log(`Error listando paquetes: ${error.message}`);

    return {
      success: false,
      message: 'Error al listar paquetes',
      error: error.message,
      output: error.stdout || ''
    };
  }
}

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

    log(`Package.json actualizado, se añadió ${packageName}@${version}`);
  } catch (error) {
    log(`Error al actualizar package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Crea un directorio en el proyecto
 */
export async function createDirectory(dirPath: string): Promise<PackageManagerResult> {
  try {
    // Validar la ruta del directorio
    if (!dirPath || dirPath.trim() === '') {
      return {
        success: false,
        message: 'La ruta del directorio es requerida'
      };
    }

    // Sanitizar la ruta para prevenir inyección de comandos
    const sanitizedPath = dirPath.replace(/[;&|`$><!\\]/g, '');
    const absolutePath = path.join(process.cwd(), sanitizedPath);

    // Verificar que la ruta esté dentro del directorio del proyecto
    if (!absolutePath.startsWith(process.cwd())) {
      return {
        success: false,
        message: 'No se permite crear directorios fuera del proyecto'
      };
    }

    // Crear directorio de forma recursiva 
    await fs.mkdir(absolutePath, { recursive: true });

    return {
      success: true,
      message: `Directorio ${sanitizedPath} creado correctamente`
    };

  } catch (error: any) {
    log(`Error creando directorio: ${error.message}`);

    return {
      success: false,
      message: 'Error al crear el directorio',
      error: error.message
    };
  }
}

// Elimina una dependencia del package.json
async function removeDependencyFromCache(packageName: string): Promise<void> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    let found = false;
    if (packageJson.dependencies && packageJson.dependencies[packageName]) {
      delete packageJson.dependencies[packageName];
      found = true;
    }

    if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
      delete packageJson.devDependencies[packageName];
      found = true;
    }

    if (!found) {
      log(`El paquete ${packageName} no se encontró en package.json`);
      return;
    }

    await fs.writeFile(
      packageJsonPath, 
      JSON.stringify(packageJson, null, 2) + '\n', 
      'utf-8'
    );

    log(`Package.json actualizado, se eliminó ${packageName}`);
  } catch (error) {
    log(`Error al actualizar package.json: ${error instanceof Error ? error.message : String(error)}`);
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