"use client"

import { useState, useEffect } from "react"
import { Loader2, MapPin, Store, CheckCircle, Building, Home, MoreVertical, Check, X, AlertCircle } from "lucide-react"
import { useToast } from "./toast-notification"
import { EntregaProductosModal } from "./entrega-productos-modal"
import { CancelarPedidoModal } from "./cancelar-pedido-modal"

type Ruta = {
  id: string
  nombre: string
}

type Cliente = {
  id: string
  local: string
  direccion: string
  lat?: number
  lng?: number
  isExtra?: boolean
  es_extemporaneo?: boolean | number
}

type EstadoPedido = {
  estado: "pendiente" | "completado" | "cancelado" | null
  motivo_cancelacion: string | null
  productos: {
    gourmet15: number
    gourmet5: number
    barraHielo: number
    mediaBarra: number
    premium: number
  }
}

export function SeguimientoContent() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoadingRutas, setIsLoadingRutas] = useState(true)
  const [selectedRuta, setSelectedRuta] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoadingClientes, setIsLoadingClientes] = useState(false)
  const [estadoPedidos, setEstadoPedidos] = useState<Record<string, EstadoPedido>>({})
  const [estadoSeguimiento, setEstadoSeguimiento] = useState<Record<string, string>>({})
  const [isLoadingEstado, setIsLoadingEstado] = useState(false)
  const [clienteActivo, setClienteActivo] = useState<string | null>(null)
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null)
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false)
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [actualizandoEstado, setActualizandoEstado] = useState(false)
  const { showToast } = useToast()

  // Cargar rutas al montar el componente
  useEffect(() => {
    async function fetchRutas() {
      setIsLoadingRutas(true)
      try {
        const response = await fetch("/api/rutas")
        if (response.ok) {
          const data = await response.json()
          // Filtrar la ruta LOCAL
          const rutasFiltradas = data.filter((ruta: Ruta) => ruta.id !== "LOCAL")
          setRutas(rutasFiltradas)
        } else {
          console.error("Error al cargar rutas")
        }
      } catch (error) {
        console.error("Error al cargar rutas:", error)
      } finally {
        setIsLoadingRutas(false)
      }
    }

    fetchRutas()
  }, [])

  // Cargar clientes cuando se selecciona una ruta
  useEffect(() => {
    if (!selectedRuta) return

    async function fetchClientes() {
      setIsLoadingClientes(true)
      try {
        const response = await fetch(`/api/clientes/ruta/${selectedRuta}`)
        if (response.ok) {
          const data = await response.json()
          setClientes(data)

          // Cargar el estado de los pedidos
          await cargarEstadoPedidos(selectedRuta)

          // Cargar el estado de seguimiento
          await cargarEstadoSeguimiento(selectedRuta)

          // Cargar el cliente activo (esto ahora establecerá el primero como activo si no hay ninguno)
          await cargarClienteActivo(selectedRuta)
        } else {
          console.error(`Error al cargar clientes para la ruta ${selectedRuta}`)
        }
      } catch (error) {
        console.error(`Error al cargar clientes para la ruta ${selectedRuta}:`, error)
      } finally {
        setIsLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [selectedRuta])

  // Cargar el estado de los pedidos
  const cargarEstadoPedidos = async (rutaId: string) => {
    setIsLoadingEstado(true)
    try {
      const response = await fetch(`/api/pedidos/estado?rutaId=${rutaId}`)
      if (response.ok) {
        const data = await response.json()
        setEstadoPedidos(data)
      } else {
        console.error(`Error al cargar estado de pedidos para la ruta ${rutaId}`)
      }
    } catch (error) {
      console.error(`Error al cargar estado de pedidos:`, error)
    } finally {
      setIsLoadingEstado(false)
    }
  }

  // Cargar el estado de seguimiento
  const cargarEstadoSeguimiento = async (rutaId: string) => {
    try {
      const response = await fetch(`/api/pedidos/estado-seguimiento?rutaId=${rutaId}`)
      if (response.ok) {
        const data = await response.json()
        setEstadoSeguimiento(data)
      } else {
        console.error(`Error al cargar estado de seguimiento para la ruta ${rutaId}`)
      }
    } catch (error) {
      console.error(`Error al cargar estado de seguimiento:`, error)
    }
  }

  // Cargar el cliente activo
  const cargarClienteActivo = async (rutaId: string) => {
    try {
      const response = await fetch(`/api/pedidos/cliente-activo?rutaId=${rutaId}`)
      if (response.ok) {
        const data = await response.json()

        // Si ya hay un cliente activo, usarlo
        if (data.clienteActivo) {
          setClienteActivo(data.clienteActivo)
        }
        // Si no hay cliente activo, establecer el primero como activo
        else if (clientes.length > 0) {
          // Buscar el primer cliente que no esté completado o cancelado
          const primerClientePendiente = clientes.find((cliente) => {
            const estado = estadoSeguimiento[cliente.id] || "pendiente"
            return estado !== "completado" && estado !== "cancelado"
          })

          if (primerClientePendiente) {
            establecerClienteActivo(primerClientePendiente.id, rutaId)
          }
        }
      } else {
        console.error(`Error al cargar cliente activo para la ruta ${rutaId}`)
      }
    } catch (error) {
      console.error(`Error al cargar cliente activo:`, error)
    }
  }

  // Establecer un cliente como activo
  const establecerClienteActivo = async (clienteId: string, rutaId: string) => {
    try {
      const response = await fetch("/api/pedidos/cliente-activo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId,
          rutaId,
        }),
      })

      if (response.ok) {
        setClienteActivo(clienteId)

        // Actualizar el estado de seguimiento localmente
        setEstadoSeguimiento((prev) => {
          const nuevo = { ...prev }
          // Establecer todos como pendientes
          Object.keys(nuevo).forEach((id) => {
            if (nuevo[id] === "activo") {
              nuevo[id] = "pendiente"
            }
          })
          // Establecer el seleccionado como activo
          nuevo[clienteId] = "activo"
          return nuevo
        })
      } else {
        console.error("Error al establecer cliente activo")
      }
    } catch (error) {
      console.error("Error al establecer cliente activo:", error)
    }
  }

  // Manejar la selección de ruta
  const handleRutaClick = (rutaId: string) => {
    setSelectedRuta(rutaId === selectedRuta ? null : rutaId)
    setClienteActivo(null)
    setEstadoPedidos({})
    setEstadoSeguimiento({})
    setMenuAbierto(null)
  }

  // Función para determinar el icono según el tipo de cliente
  const getClienteIcon = (cliente: Cliente) => {
    if (cliente.isExtra) {
      return <Store className="h-4 w-4 text-blue-400" />
    } else if (cliente.local.toLowerCase().includes("bar") || cliente.local.toLowerCase().includes("restaurante")) {
      return <Building className="h-4 w-4 text-blue-400" />
    } else if (cliente.local.toLowerCase().includes("casa")) {
      return <Home className="h-4 w-4 text-blue-400" />
    } else {
      return <Store className="h-4 w-4 text-blue-400" />
    }
  }

  // Función para limpiar el nombre del cliente
  const limpiarNombre = (nombre: string) => {
    // Eliminar cualquier número o secuencia de números al final del nombre
    return nombre.replace(/\s*\d+$/, "")
  }

  // Manejar clic en el menú de opciones
  const handleMenuClick = (clienteId: string) => {
    setMenuAbierto(menuAbierto === clienteId ? null : clienteId)
  }

  // Manejar clic en completar pedido
  const handleCompletarClick = (cliente: Cliente) => {
    setClienteSeleccionado(cliente)
    setModalEntregaAbierto(true)
    setMenuAbierto(null)
  }

  // Manejar clic en cancelar pedido
  const handleCancelarClick = (cliente: Cliente) => {
    setClienteSeleccionado(cliente)
    setModalCancelarAbierto(true)
    setMenuAbierto(null)
  }

  // Confirmar entrega de productos
  const confirmarEntrega = async (cantidades: Record<string, number>) => {
    if (!clienteSeleccionado || !selectedRuta) return

    setActualizandoEstado(true)
    try {
      const response = await fetch("/api/pedidos/actualizar-estado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          rutaId: selectedRuta,
          estado: "completado",
          productos: cantidades,
        }),
      })

      if (response.ok) {
        showToast("Pedido completado correctamente", "success")

        // Guardar el ID del cliente actual antes de actualizar el estado
        const clienteActualId = clienteSeleccionado.id

        // Actualizar el estado de los pedidos
        await cargarEstadoPedidos(selectedRuta)

        // Actualizar el estado de seguimiento
        await actualizarEstadoSeguimiento(clienteActualId, "completado")

        // Avanzar al siguiente cliente
        avanzarAlSiguienteCliente(clienteActualId)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al completar el pedido")
      }
    } catch (error) {
      console.error("Error al completar pedido:", error)
      showToast(error instanceof Error ? error.message : "Error al completar el pedido", "error")
    } finally {
      setActualizandoEstado(false)
      setClienteSeleccionado(null)
    }
  }

  // Confirmar cancelación de pedido
  const confirmarCancelacion = async (motivo: string) => {
    if (!clienteSeleccionado || !selectedRuta) return

    setActualizandoEstado(true)
    try {
      const response = await fetch("/api/pedidos/actualizar-estado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          rutaId: selectedRuta,
          estado: "cancelado",
          motivo,
        }),
      })

      if (response.ok) {
        showToast("Pedido cancelado correctamente", "success")

        // Guardar el ID del cliente actual antes de actualizar el estado
        const clienteActualId = clienteSeleccionado.id

        // Actualizar el estado de los pedidos
        await cargarEstadoPedidos(selectedRuta)

        // Actualizar el estado de seguimiento
        await actualizarEstadoSeguimiento(clienteActualId, "cancelado")

        // Avanzar al siguiente cliente
        avanzarAlSiguienteCliente(clienteActualId)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al cancelar el pedido")
      }
    } catch (error) {
      console.error("Error al cancelar pedido:", error)
      showToast(error instanceof Error ? error.message : "Error al cancelar el pedido", "error")
    } finally {
      setActualizandoEstado(false)
      setClienteSeleccionado(null)
    }
  }

  // Actualizar el estado de seguimiento
  const actualizarEstadoSeguimiento = async (clienteId: string, estado: string) => {
    if (!selectedRuta) return

    try {
      const response = await fetch("/api/pedidos/estado-seguimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId,
          rutaId: selectedRuta,
          estado,
        }),
      })

      if (response.ok) {
        // Actualizar el estado localmente
        setEstadoSeguimiento((prev) => ({
          ...prev,
          [clienteId]: estado,
        }))
      } else {
        console.error("Error al actualizar estado de seguimiento")
      }
    } catch (error) {
      console.error("Error al actualizar estado de seguimiento:", error)
    }
  }

  // Avanzar al siguiente cliente
  const avanzarAlSiguienteCliente = async (clienteIdActual: string) => {
    if (!selectedRuta) return

    // Encontrar el índice del cliente actual
    const indexActual = clientes.findIndex((c) => c.id === clienteIdActual)

    // Si no se encuentra o es el último, no hay siguiente
    if (indexActual === -1 || indexActual >= clientes.length - 1) {
      setClienteActivo(null)
      return
    }

    // Buscar el siguiente cliente que no esté completado o cancelado
    let siguienteCliente = null
    for (let i = indexActual + 1; i < clientes.length; i++) {
      const cliente = clientes[i]
      const estado = estadoSeguimiento[cliente.id] || "pendiente"
      if (estado !== "completado" && estado !== "cancelado") {
        siguienteCliente = cliente
        break
      }
    }

    if (siguienteCliente) {
      // Establecer el siguiente cliente como activo
      await establecerClienteActivo(siguienteCliente.id, selectedRuta)
    } else {
      // Si no hay más clientes pendientes, no hay cliente activo
      setClienteActivo(null)
    }
  }

  // Obtener el estado de un cliente
  const getEstadoCliente = (clienteId: string) => {
    return estadoPedidos[clienteId]?.estado || null
  }

  // Verificar si un cliente es el activo
  const esClienteActivo = (clienteId: string) => {
    return clienteId === clienteActivo || estadoSeguimiento[clienteId] === "activo"
  }

  // Obtener la clase CSS según el estado del cliente
  const getClaseEstado = (clienteId: string) => {
    const estado = estadoPedidos[clienteId]?.estado
    const estadoSeg = estadoSeguimiento[clienteId]

    if (estadoSeg === "completado") return "border-l-4 border-green-500 bg-green-900/10"
    if (estadoSeg === "cancelado") return "border-l-4 border-red-500 bg-red-900/10"
    if (estadoSeg === "activo" || clienteId === clienteActivo) return "border-l-4 border-yellow-500 bg-yellow-900/10"
    return ""
  }

  if (isLoadingRutas) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mr-3" />
        <span className="text-xl text-gray-300">Cargando rutas disponibles...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Botones de rutas */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {rutas.map((ruta) => (
          <button
            key={ruta.id}
            onClick={() => handleRutaClick(ruta.id)}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${
                selectedRuta === ruta.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-blue-600/80 text-white hover:bg-blue-500"
              }
            `}
          >
            Ruta {ruta.id}
          </button>
        ))}
      </div>

      {/* Lista de clientes */}
      {selectedRuta && (
        <div className="mt-8 border border-gray-700/50 rounded-lg overflow-hidden">
          {isLoadingClientes || isLoadingEstado ? (
            <div className="flex justify-center items-center py-12 bg-gray-900/50">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-3" />
              <span className="text-gray-300">Cargando clientes...</span>
            </div>
          ) : clientes.length > 0 ? (
            <div className="divide-y divide-gray-700/50">
              {clientes.map((cliente) => {
                // Limpiar el nombre del cliente antes de mostrarlo
                const nombreLimpio = limpiarNombre(cliente.local)
                const estado = getEstadoCliente(cliente.id)
                const esActivo = esClienteActivo(cliente.id)
                const estadoSeg = estadoSeguimiento[cliente.id] || "pendiente"

                return (
                  <div
                    key={cliente.id}
                    className={`
                      p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors
                      ${cliente.isExtra ? "border-l-4 border-blue-500" : ""}
                      ${cliente.es_extemporaneo ? "border-l-4 border-purple-500" : ""}
                      ${getClaseEstado(cliente.id)}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {getClienteIcon(cliente)}
                          <h3 className="font-medium text-white">
                            {nombreLimpio}
                            {cliente.isExtra && (
                              <span className="ml-2 text-xs bg-blue-600/30 text-blue-200 px-2 py-0.5 rounded-full">
                                Extra
                              </span>
                            )}
                            {cliente.es_extemporaneo && (
                              <span className="ml-2 text-xs bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full">
                                Extemporáneo
                              </span>
                            )}
                            {esActivo && (
                              <span className="ml-2 text-xs bg-yellow-600/30 text-yellow-200 px-2 py-0.5 rounded-full">
                                Actual
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
                          <MapPin className="h-3.5 w-3.5" />
                          {cliente.isExtra ? (
                            <span className="text-blue-300 italic">Cantidad de Reserva</span>
                          ) : (
                            <span>{cliente.direccion || "Sin dirección específica"}</span>
                          )}
                        </div>

                        {/* Mostrar estado si existe */}
                        {estado && (
                          <div className="mt-2">
                            {estado === "completado" && (
                              <div className="flex items-center gap-1 text-sm text-green-400">
                                <Check className="h-3.5 w-3.5" />
                                <span>Pedido completado</span>
                              </div>
                            )}
                            {estado === "cancelado" && (
                              <div>
                                <div className="flex items-center gap-1 text-sm text-red-400">
                                  <X className="h-3.5 w-3.5" />
                                  <span>Pedido cancelado</span>
                                </div>
                                {estadoPedidos[cliente.id]?.motivo_cancelacion && (
                                  <div className="mt-1 text-xs text-gray-400 pl-5">
                                    Motivo: {estadoPedidos[cliente.id]?.motivo_cancelacion}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Menú de opciones (solo visible para el cliente activo) */}
                      {esActivo && estadoSeg !== "completado" && estadoSeg !== "cancelado" && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMenuClick(cliente.id)
                            }}
                            className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                          >
                            <MoreVertical className="h-5 w-5 text-gray-400" />
                          </button>

                          {menuAbierto === cliente.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCompletarClick(cliente)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 rounded-t-md"
                              >
                                <Check className="h-4 w-4 text-green-400" />
                                Completar Pedido
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelarClick(cliente)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 rounded-b-md"
                              >
                                <X className="h-4 w-4 text-red-400" />
                                Cancelar Pedido
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Indicador de estado */}
                      {estadoSeg === "pendiente" && (
                        <div className="bg-gray-700/50 text-gray-400 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pendiente
                        </div>
                      )}
                      {estadoSeg === "activo" && (
                        <div className="bg-yellow-900/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Activo
                        </div>
                      )}
                      {estadoSeg === "completado" && (
                        <div className="bg-green-900/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completado
                        </div>
                      )}
                      {estadoSeg === "cancelado" && (
                        <div className="bg-red-900/20 text-red-400 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <X className="h-3 w-3 mr-1" />
                          Cancelado
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-900/50">
              <p className="text-gray-400">No hay clientes asignados a esta ruta para hoy</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de entrega de productos */}
      {clienteSeleccionado && (
        <EntregaProductosModal
          isOpen={modalEntregaAbierto}
          onClose={() => setModalEntregaAbierto(false)}
          cliente={clienteSeleccionado}
          rutaId={selectedRuta || ""}
          onConfirm={confirmarEntrega}
        />
      )}

      {/* Modal de cancelación de pedido */}
      {clienteSeleccionado && (
        <CancelarPedidoModal
          isOpen={modalCancelarAbierto}
          onClose={() => setModalCancelarAbierto(false)}
          cliente={clienteSeleccionado}
          onConfirm={confirmarCancelacion}
        />
      )}
    </div>
  )
}
