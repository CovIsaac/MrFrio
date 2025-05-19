import { Suspense } from "react"
import { Database, Settings, Shield } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Header with background effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <img src="/mrfrio-logo.png" alt="Mr. Frío de San Luis" width={320} height={64} className="drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Admin Section */}
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield className="h-6 w-6 text-blue-400" />
              <h1 className="text-3xl font-bold text-center">Administración del Sistema</h1>
            </div>

            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 mb-8">
              <p className="text-red-200 text-center">
                <strong>¡Advertencia!</strong> Las acciones en esta página pueden afectar el funcionamiento del sistema.
                Úsalas con precaución.
              </p>
            </div>

            <Suspense fallback={<div className="text-center py-8">Cargando opciones de administración...</div>}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base de Datos */}
                <div className="border border-gray-700/50 rounded-lg p-6 bg-black/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-bold">Base de Datos</h2>
                  </div>

                  <p className="text-gray-400 mb-6">
                    Herramientas para administrar la estructura de la base de datos y realizar operaciones de
                    mantenimiento.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Configuración de Base de Datos</h3>
                      <p className="text-xs text-gray-500 mb-2">
                        Las opciones de configuración de base de datos estarán disponibles próximamente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuración */}
                <div className="border border-gray-700/50 rounded-lg p-6 bg-black/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-bold">Configuración</h2>
                  </div>

                  <p className="text-gray-400 mb-6">
                    Opciones de configuración del sistema y herramientas de mantenimiento general.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Opciones de Configuración</h3>
                      <p className="text-xs text-gray-500 mb-2">
                        Las opciones de configuración estarán disponibles en futuras actualizaciones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/80 border-t border-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Mr. Frío de San Luis - Hielo Gourmet. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
