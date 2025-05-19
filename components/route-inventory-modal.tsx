"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Truck, User, AlertCircle, Package, History, Loader2, Calendar } from "lucide-react"
import { useToast } from "./toast-notification"

// Tipos de productos disponibles
const PRODUCTOS = [
  { id: "gourmet15", nombre: "GOURMET 15KG" },
  { id: "gourmet5", nombre: "GOURMET 5KG" },
  { id: "barraHielo", nombre: "BARRA HIELO" },
  { id: "mediaBarra", nombre: "MEDIA BARRA" },
  { id: "premium", nombre: "PREMIUM" },
]

// Tipo para los ruteros
type Rutero = {
  id: string
  nombre: string
}

// Tipo para los clientes
type Cliente = {
  id: string
  local: string
  direccion: string
  isExtra?: boolean
  es_extemporaneo?: boolean | number
}

// Tipo para los pedidos de clientes
type Pedido = {
  clienteId: string
  productos: {
    [key: string]: number
  }
}

// Tipo para los totales de productos
type Totales = {
  [key: string]: number
}

// Tipo para el historial de sobrantes
type RegistroSobrante = {
  fecha: string
  ruta: string
  productos: {
    [key: string]: number
  }
}

type RouteInventoryModalProps = {
  routeId: string
  routeName: string
  isOpen: boolean
  onClose: () => void
  clientes?: Cliente[]
  diaActual?: string
}

export function RouteInventoryModal({
  routeId,
  routeName,
  isOpen,
  onClose,
  clientes = [],
  diaActual = "",
}: RouteInventoryModalProps) {
  const [mounted, setMounted] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [totales, setTotales] = useState<Totales>({})
  const [ruteroSeleccionado, setRuteroSeleccionado] = useState("")
  const [ruteroHistorialSeleccionado, setRuteroHistorialSeleccionado] = useState("")
  const [ruteros, setRuteros] = useState<Rutero[]>([])
  const [historialSobrantes, setHistorialSobrantes] = useState<RegistroSobrante[]>([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [mostrarRutasCanceladas, setMostrarRutasCanceladas] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRuteros, setIsLoadingRuteros] = useState(false)
  const [isLoadingSobrantes, setIsLoadingSobrantes] = useState(false)
  const [dataCargada, setDataCargada] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Cargar ruteros cuando se abre el modal (solo una vez)
  useEffect(() => {
    async function fetchRuteros() {
      if (!isOpen || dataCargada) return

      setIsLoadingRuteros(true)
      try {
        const response = await fetch("/api/ruteros")
        if (response.ok) {
          const data = await response.json()
          setRuteros(data)

          // Seleccionar el primer rutero por defecto para la ruta LOCAL
          if (routeId === "LOCAL" && data.length > 0) {
            setRuteroHistorialSeleccionado(data[0].id)
          }

          setDataCargada(true)
        } else {
          showToast("Error al cargar los ruteros", "error")
        }
      } catch (error) {
        console.error("Error al cargar ruteros:", error)
        showToast("Error al cargar los ruteros", "error")
      } finally {
        setIsLoadingRuteros(false)
      }
    }

    fetchRuteros()
  }, [isOpen, routeId, showToast, dataCargada])

  // Inicializar pedidos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)

      if (routeId === "LOCAL") {
        setIsLoading(false)
      } else {
        // Para rutas normales, inicializar pedidos con 0 para cada producto
        if (clientes.length > 0) {
          const pedidosIniciales = clientes.map((cliente) => ({
            clienteId: cliente.id,
            productos: PRODUCTOS.reduce(
              (acc, producto) => {
                acc[producto.id] = 0
                return acc
              },
              {} as { [key: string]: number },
            ),
          }))

          setPedidos(pedidosIniciales)
          calcularTotales(pedidosIniciales)
        }
        setIsLoading(false)
      }
    } else {
      // Reiniciar estados cuando se cierra el modal
      setPedidos([])
      setTotales({})
      setRuteroSeleccionado("")
      setMostrarHistorial(false)
      setMostrarRutasCanceladas(false)
    }
  }, [isOpen, routeId, clientes])

  // Bloquear el scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscapeKey)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isOpen, onClose])

  // Calcular totales de productos
  const calcularTotales = (pedidosActuales: Pedido[]) => {
    const nuevosTotales = PRODUCTOS.reduce((acc, producto) => {
      acc[producto.id] = pedidosActuales.reduce((sum, pedido) => sum + (pedido.productos[producto.id] || 0), 0)
      return acc
    }, {} as Totales)

    setTotales(nuevosTotales)
  }

  // Manejar cambio en la cantidad de un producto
  const handleCantidadChange = (clienteId: string, productoId: string, cantidad: number) => {
    // Validar que la cantidad no sea negativa
    if (cantidad < 0) cantidad = 0

    const nuevosPedidos = pedidos.map((pedido) => {
      if (pedido.clienteId === clienteId) {
        return {
          ...pedido,
          productos: {
            ...pedido.productos,
            [productoId]: cantidad,
          },
        }
      }
      return pedido
    })

    setPedidos(nuevosPedidos)
    calcularTotales(nuevosPedidos)
  }

  // Asignar ruta a un rutero
  const handleAsignarRuta = async () => {
    if (!ruteroSeleccionado) return

    setAsignando(true)

    try {
      // Preparar los datos para la API
      const asignacionData = {
        rutaId: routeId,
        ruteroId: ruteroSeleccionado,
        pedidos: pedidos, // Enviamos todos los pedidos para calcular totales
      }

      // Enviar la asignación a la API
      const response = await fetch("/api/asignaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(asignacionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al asignar ruta")
      }

      // Mostrar notificación de éxito
      showToast("Ruta asignada correctamente. Se ha registrado el inventario inicial.", "success")

      // Éxito - cerrar el modal
      onClose()
    } catch (error) {
      console.error("Error al asignar ruta:", error)
      showToast(error instanceof Error ? error.message : "Error al asignar ruta", "error")
    } finally {
      setAsignando(false)
    }
  }

  // Manejar la visualización del historial y cargar los sobrantes
  const handleVerHistorial = async () => {
    if (!ruteroHistorialSeleccionado) return

    setMostrarHistorial(true)
    setIsLoadingSobrantes(true)

    try {
      const apiUrl = `/api/sobrantes?ruteroId=${ruteroHistorialSeleccionado}`
      const response = await fetch(apiUrl)

      if (response.ok) {
        const data = await response.json()
        setHistorialSobrantes(data)
      } else {
        showToast("Error al cargar el historial de sobrantes", "error")
      }
    } catch (error) {
      console.error("Error al cargar historial de sobrantes:", error)
      showToast("Error al cargar el historial de sobrantes", "error")
    } finally {
      setIsLoadingSobrantes(false)
    }
  }

  // Obtener el valor de un producto para un cliente específico
  const getProductoValue = (clienteId: string, productoId: string): string => {
    const pedidoCliente = pedidos.find((p) => p.clienteId === clienteId)
    if (!pedidoCliente) return ""

    const cantidad = pedidoCliente.productos[productoId]
    return cantidad === 0 ? "" : cantidad.toString()
  }

  // Renderizar el contenido según el tipo de ruta
  const renderizarContenido = () => {
    if (isLoading) {
      return (
        <div className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-500 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-400">Cargando datos...</span>
          </div>
        </div>
      )
    }

    if (routeId === "LOCAL") {
      return (
        <>
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                Historial de Inventario por Rutero
              </h2>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-md mx-auto bg-gray-900/70 rounded-lg p-6 border border-gray-700/50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2 text-center">Selecciona Rutero:</label>
                  {isLoadingRuteros ? (
                    <div className="flex justify-center items-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                      <span>Cargando ruteros...</span>
                    </div>
                  ) : (
                    <select
                      value={ruteroHistorialSeleccionado}
                      onChange={(e) => {
                        setRuteroHistorialSeleccionado(e.target.value)
                        setMostrarHistorial(false)
                      }}
                      className="w-full py-2 px-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ruteros.length > 0 ? (
                        ruteros.map((rutero) => (
                          <option key={rutero.id} value={rutero.id}>
                            {rutero.nombre}
                          </option>
                        ))
                      ) : (
                        <option value="">No hay ruteros disponibles</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleVerHistorial}
                    disabled={!ruteroHistorialSeleccionado || isLoadingRuteros}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ver Historial
                  </button>
                </div>
              </div>
            </div>

            {mostrarHistorial && (
              <div className="mt-6 overflow-x-auto">
                {isLoadingSobrantes ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                    <span>Cargando historial...</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-900/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800">
                          Ruta
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800">
                          Fecha
                        </th>
                        {PRODUCTOS.map((producto) => (
                          <th
                            key={producto.id}
                            className="py-3 px-4 text-center text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800"
                          >
                            {producto.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {historialSobrantes.length > 0 ? (
                        historialSobrantes.map((registro, index) => (
                          <tr
                            key={`${registro.fecha}-${registro.ruta}`}
                            className={index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/10"}
                          >
                            <td className="py-3 px-4 text-sm font-medium text-blue-400">{registro.ruta}</td>
                            <td className="py-3 px-4 text-sm text-gray-300">{registro.fecha}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.gourmet15}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.gourmet5}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.barraHielo}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.mediaBarra}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.premium}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-gray-400">
                            No hay registros para este rutero
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )
    } else {
      // Contenido para rutas normales
      return (
        <>
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                  Inventario de Ruta: {routeName}
                </h2>
              </div>

              {diaActual && (
                <div className="flex items-center text-sm text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  {diaActual}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {clientes.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-900/50 rounded-lg p-6 inline-block mb-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-white mb-2">No hay clientes asignados</h3>
                  <p className="text-gray-400">
                    Esta ruta no tiene clientes asignados para el día de hoy. Agrega clientes a esta ruta para poder
                    asignar pedidos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-900/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800">
                          Local
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800">
                          Dirección
                        </th>
                        {PRODUCTOS.map((producto) => (
                          <th
                            key={producto.id}
                            className="py-3 px-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800"
                          >
                            {producto.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {clientes.map((cliente, index) => {
                        const isExtra = Boolean(cliente.isExtra)
                        const esExtemporaneo = Boolean(cliente.es_extemporaneo)

                        return (
                          <tr
                            key={cliente.id}
                            className={`
                              ${index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/10"}
                              ${isExtra ? "bg-blue-900/20 relative" : ""}
                            `}
                          >
                            <td className="py-3 px-4 text-sm font-medium text-white relative">
                              {isExtra && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                              <div className="flex items-center gap-2">
                                {isExtra && <Package className="h-4 w-4 text-blue-400" />}
                                <span>{cliente.local}</span>
                                {isExtra && (
                                  <span className="text-xs bg-blue-600/30 text-blue-200 px-2 py-0.5 rounded-full">
                                    Extra
                                  </span>
                                )}
                                {esExtemporaneo && (
                                  <span className="text-xs bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full ml-1">
                                    Extemporáneo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {isExtra ? (
                                <span className="text-blue-300 italic">Sin dirección física</span>
                              ) : (
                                <span className="text-gray-300">{cliente.direccion}</span>
                              )}
                            </td>
                            {PRODUCTOS.map((producto) => (
                              <td key={producto.id} className="py-2 px-2 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={getProductoValue(cliente.id, producto.id)}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    // Permitir campo vacío (que se convertirá a 0) o solo números positivos
                                    if (value === "" || /^[0-9]+$/.test(value)) {
                                      handleCantidadChange(
                                        cliente.id,
                                        producto.id,
                                        value === "" ? 0 : Number.parseInt(value),
                                      )
                                    }
                                  }}
                                  className={`
                                    w-16 py-1 px-2 text-center rounded border text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                    ${isExtra ? "bg-blue-900/40 border-blue-700/50" : "bg-gray-800 border-gray-700"}
                                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                  `}
                                  placeholder="0"
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      })}

                      {/* Fila de totales */}
                      <tr className="bg-gray-800/70 font-medium">
                        <td colSpan={2} className="py-3 px-4 text-sm text-white uppercase">
                          Total
                        </td>
                        {PRODUCTOS.map((producto) => (
                          <td key={producto.id} className="py-3 px-4 text-center text-white">
                            {totales[producto.id] || 0}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-gray-800 bg-gray-900/30 rounded-b-xl">
            <div className="max-w-md mx-auto bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-medium text-center mb-4 flex items-center justify-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Asignar Pedidos a Rutero
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Selecciona Rutero:</label>
                  {isLoadingRuteros ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400 mr-2" />
                      <span className="text-sm text-gray-300">Cargando ruteros...</span>
                    </div>
                  ) : (
                    <select
                      value={ruteroSeleccionado}
                      onChange={(e) => setRuteroSeleccionado(e.target.value)}
                      className="w-full py-2 px-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar rutero...</option>
                      {ruteros.map((rutero) => (
                        <option key={rutero.id} value={rutero.id}>
                          {rutero.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleAsignarRuta}
                    disabled={!ruteroSeleccionado || asignando || clientes.length === 0}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {asignando ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Asignando...
                      </>
                    ) : (
                      "Asignar"
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setMostrarRutasCanceladas(!mostrarRutasCanceladas)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <AlertCircle className="h-4 w-4" />
                {mostrarRutasCanceladas ? "Ocultar Rutas Canceladas" : "Mostrar Rutas Canceladas"}
              </button>

              {mostrarRutasCanceladas && (
                <div className="mt-3 p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                  <p className="text-sm text-gray-300">No hay rutas canceladas para mostrar.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )
    }
  }

  // El modal que se renderizará en el portal
  const modalContent =
    isOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={onClose}
              style={{ animation: "fadeIn 150ms ease-out" }}
            ></div>

            {/* Modal Content */}
            <div
              ref={modalRef}
              className="relative w-full max-w-5xl mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl backdrop-blur-sm bg-black/90 text-white"
              style={{ animation: "fadeIn 200ms ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón de cierre */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-1.5 bg-gray-800/80 text-gray-400 transition-colors hover:text-white hover:bg-gray-700 z-20"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>

              {/* Contenido según el tipo de ruta */}
              {renderizarContenido()}
            </div>
          </div>,
          document.body,
        )
      : null

  return modalContent
}