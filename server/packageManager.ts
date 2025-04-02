
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from './vite';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

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

  try {
    // Construir el comando de instalación
    let command = '';
    const packageSpec = version ? `${packageName}@${version}` : packageName;
    
    switch (manager) {
      case 'npm':
        command = `npm install ${packageSpec}${isDev ? ' --save-dev' : ''}${global ? ' -g' : ''}`;
        break;
      case 'yarn':
        command = `yarn add ${packageSpec}${isDev ? ' --dev' : ''}${global ? ' global' : ''}`;
        break;
      case 'pnpm':
        command = `pnpm add ${packageSpec}${isDev ? ' --save-dev' : ''}${global ? ' --global' : ''}`;
        break;
      case 'bun':
        command = `bun add ${packageSpec}${isDev ? ' --dev' : ''}${global ? ' --global' : ''}`;
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('npm notice') && !stderr.includes('npm WARN')) {
      return {
        success: false,
        message: `Error al instalar ${packageName}`,
        output: stdout,
        error: stderr
      };
    }

    // Actualizar package.json en memoria si es necesario
    await updateDependenciesCache(packageName, version, isDev);

    return {
      success: true,
      message: `Paquete ${packageName} instalado correctamente`,
      output: stdout
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al instalar ${packageName}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Desinstala un paquete usando el gestor especificado
 */
export async function uninstallPackage(options: Omit<PackageInstallOptions, 'version'>): Promise<PackageManagerResult> {
  const { 
    packageName, 
    isDev = false, 
    manager = 'npm', 
    global = false 
  } = options;

  try {
    // Construir el comando de desinstalación
    let command = '';
    
    switch (manager) {
      case 'npm':
        command = `npm uninstall ${packageName}${global ? ' -g' : ''}`;
        break;
      case 'yarn':
        command = `yarn remove ${packageName}${global ? ' global' : ''}`;
        break;
      case 'pnpm':
        command = `pnpm remove ${packageName}${global ? ' --global' : ''}`;
        break;
      case 'bun':
        command = `bun remove ${packageName}${global ? ' --global' : ''}`;
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    return {
      success: true,
      message: `Paquete ${packageName} desinstalado correctamente`,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al desinstalar ${packageName}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Listar los paquetes instalados
 */
export async function listPackages(manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    let command = '';
    
    switch (manager) {
      case 'npm':
        command = 'npm list --depth=0';
        break;
      case 'yarn':
        command = 'yarn list --depth=0';
        break;
      case 'pnpm':
        command = 'pnpm list --depth=0';
        break;
      case 'bun':
        command = 'bun pm ls';
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    const { stdout } = await execAsync(command);
    
    return {
      success: true,
      message: 'Paquetes instalados',
      output: stdout
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error al listar paquetes',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Actualizar el cache de dependencias en memoria
 */
async function updateDependenciesCache(packageName: string, version?: string, isDev: boolean = false): Promise<void> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // Obtener la versión real si no se proporcionó
    if (!version) {
      try {
        const installedPackageJson = require(`${process.cwd()}/node_modules/${packageName}/package.json`);
        version = installedPackageJson.version;
      } catch (e) {
        // Si no se puede obtener, usar '*'
        version = '*';
      }
    }
    
    // Actualizar dependencias en el objeto
    const dependencyType = isDev ? 'devDependencies' : 'dependencies';
    if (!packageJson[dependencyType]) {
      packageJson[dependencyType] = {};
    }
    
    packageJson[dependencyType][packageName] = version;
    
    // Guardar el archivo actualizado
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
    
    log(`Package.json actualizado con ${packageName}@${version} en ${dependencyType}`);
  } catch (error) {
    log(`Error al actualizar package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ejecutar un script de npm
 */
export async function runScript(scriptName: string, manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    let command = '';
    
    switch (manager) {
      case 'npm':
        command = `npm run ${scriptName}`;
        break;
      case 'yarn':
        command = `yarn ${scriptName}`;
        break;
      case 'pnpm':
        command = `pnpm run ${scriptName}`;
        break;
      case 'bun':
        command = `bun run ${scriptName}`;
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    log(`Ejecutando script: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    return {
      success: true,
      message: `Script ${scriptName} ejecutado correctamente`,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al ejecutar script ${scriptName}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Obtener información sobre un paquete
 */
export async function getPackageInfo(packageName: string, manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'): Promise<PackageManagerResult> {
  try {
    let command = '';
    
    switch (manager) {
      case 'npm':
        command = `npm info ${packageName}`;
        break;
      case 'yarn':
        command = `yarn info ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm info ${packageName}`;
        break;
      case 'bun':
        command = `bun pm info ${packageName}`;
        break;
      default:
        return {
          success: false,
          message: `Gestor de paquetes "${manager}" no soportado`
        };
    }

    const { stdout } = await execAsync(command);
    
    return {
      success: true,
      message: `Información del paquete ${packageName}`,
      output: stdout
    };
  } catch (error) {
    return {
      success: false,
      message: `Error al obtener información del paquete ${packageName}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
