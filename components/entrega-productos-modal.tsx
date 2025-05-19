"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Package, Check, AlertCircle, DollarSign } from "lucide-react"
import { useToast } from "./toast-notification"

// Tipos de productos disponibles
const PRODUCTOS = [
  { id: "gourmet15", nombre: "GOURMET 15KG" },
  { id: "gourmet5", nombre: "GOURMET 5KG" },
  { id: "barraHielo", nombre: "BARRA HIELO" },
  { id: "mediaBarra", nombre: "MEDIA BARRA" },
  { id: "premium", nombre: "PREMIUM" },
]

type PrecioInfo = {
  base: number
  personalizado: number | null
}

type EntregaProductosModalProps = {
  isOpen: boolean
  onClose: () => void
  cliente: {
    id: string
    local: string
  }
  rutaId: string
  onConfirm: (cantidades: Record<string, number>) => void
}

export function EntregaProductosModal({ isOpen, onClose, cliente, rutaId, onConfirm }: EntregaProductosModalProps) {
  const [mounted, setMounted] = useState(false)
  const [cantidades, setCantidades] = useState<Record<string, string | number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inventarioDisponible, setInventarioDisponible] = useState<Record<string, number>>({})
  const [inventarioRestante, setInventarioRestante] = useState<Record<string, number>>({})
  const [isLoadingInventario, setIsLoadingInventario] = useState(false)
  const [precios, setPrecios] = useState<Record<string, PrecioInfo>>({})
  const [isLoadingPrecios, setIsLoadingPrecios] = useState(false)
  const { showToast } = useToast()

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Inicializar cantidades cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Inicializar cantidades como cadenas vacías
      const cantidadesIniciales = PRODUCTOS.reduce(
        (acc, producto) => {
          acc[producto.id] = ""
          return acc
        },
        {} as Record<string, string | number>,
      )
      setCantidades(cantidadesIniciales)

      // Cargar inventario disponible
      cargarInventarioDisponible()

      // Cargar precios
      cargarPrecios()
    }
  }, [isOpen, rutaId, cliente.id])

  // Cargar el inventario disponible para la ruta
  const cargarInventarioDisponible = async () => {
    setIsLoadingInventario(true)
    try {
      // Obtener el inventario disponible para la ruta actual
      const response = await fetch(`/api/sobrantes/disponible?rutaId=${rutaId}`)
      if (response.ok) {
        const data = await response.json()
        const productos = data.productos || {}
        setInventarioDisponible(productos)
        // Inicializar el inventario restante con los mismos valores
        setInventarioRestante({ ...productos })
      } else {
        showToast("Error al cargar el inventario disponible", "error")
      }
    } catch (error) {
      console.error("Error al cargar inventario:", error)
      showToast("Error al cargar el inventario disponible", "error")
    } finally {
      setIsLoadingInventario(false)
    }
  }

  // Cargar precios base y precios del cliente
  const cargarPrecios = async () => {
    setIsLoadingPrecios(true)
    try {
      // Cargar precios base
      const responsePreciosBase = await fetch("/api/precios/base")
      if (!responsePreciosBase.ok) {
        throw new Error("Error al cargar precios base")
      }

      const preciosBaseData = await responsePreciosBase.json()

      // Inicializar el objeto de precios con los precios base
      const nuevosPrecios: Record<string, PrecioInfo> = {}

      preciosBaseData.forEach((producto: any) => {
        nuevosPrecios[producto.id] = {
          base: Number.parseFloat(producto.precio_base) || 0,
          personalizado: null,
        }
      })

      // Si hay un cliente seleccionado, cargar sus precios personalizados
      if (cliente.id) {
        const responsePreciosCliente = await fetch(`/api/precios/cliente?clienteId=${cliente.id}`)
        if (responsePreciosCliente.ok) {
          const data = await responsePreciosCliente.json()

          // Actualizar los precios personalizados donde existan
          Object.entries(data.precios).forEach(([productoId, precioInfo]: [string, any]) => {
            if (nuevosPrecios[productoId]) {
              nuevosPrecios[productoId].personalizado = precioInfo.personalizado
            } else {
              nuevosPrecios[productoId] = {
                base: precioInfo.base || 0,
                personalizado: precioInfo.personalizado,
              }
            }
          })
        } else if (responsePreciosCliente.status !== 404) {
          // Solo mostrar error si no es 404 (cliente sin precios personalizados)
          console.error("Error al cargar precios del cliente:", await responsePreciosCliente.text())
        }
      }

      setPrecios(nuevosPrecios)
      console.log("Precios cargados:", nuevosPrecios)
    } catch (error) {
      console.error("Error al cargar precios:", error)
      showToast("Error al cargar los precios", "error")
    } finally {
      setIsLoadingPrecios(false)
    }
  }

  // Obtener el precio a usar para un producto (personalizado o base)
  const getPrecioProducto = (productoId: string): { precio: number; esPersonalizado: boolean } => {
    const precioInfo = precios[productoId]

    if (!precioInfo) {
      return { precio: 0, esPersonalizado: false }
    }

    // Si hay un precio personalizado, usarlo
    if (precioInfo.personalizado !== null) {
      return {
        precio: precioInfo.personalizado,
        esPersonalizado: true,
      }
    }

    // Si no hay precio personalizado, usar el precio base
    return {
      precio: precioInfo.base,
      esPersonalizado: false,
    }
  }

  // Calcular el subtotal para un producto
  const calcularSubtotal = (productoId: string): number => {
    const cantidad = cantidades[productoId] === "" ? 0 : Number(cantidades[productoId])
    const { precio } = getPrecioProducto(productoId)
    return cantidad * precio
  }

  // Calcular el total general
  const calcularTotal = (): number => {
    return PRODUCTOS.reduce((total, producto) => {
      return total + calcularSubtotal(producto.id)
    }, 0)
  }

  // Manejar cambio en la cantidad de un producto
  const handleCantidadChange = (productoId: string, valor: string) => {
    // Si el valor está vacío, permitirlo
    if (valor === "") {
      // Restaurar el inventario restante al valor original para este producto
      setInventarioRestante((prev) => ({
        ...prev,
        [productoId]: inventarioDisponible[productoId] || 0,
      }))

      setCantidades((prev) => ({
        ...prev,
        [productoId]: valor,
      }))
      return
    }

    // Validar que sea un número
    if (!/^\d+$/.test(valor)) {
      return
    }

    // Convertir a número para validaciones
    const cantidad = Number.parseInt(valor, 10)

    // Validar que no sea negativo
    if (cantidad < 0) return

    // Validar que no exceda el inventario disponible
    const disponible = inventarioDisponible[productoId] || 0
    if (cantidad > disponible) {
      showToast(`No hay suficiente inventario de ${productoId}. Disponible: ${disponible}`, "error")
      setCantidades((prev) => ({
        ...prev,
        [productoId]: disponible.toString(),
      }))

      // Actualizar el inventario restante a 0 para este producto
      setInventarioRestante((prev) => ({
        ...prev,
        [productoId]: 0,
      }))

      return
    }

    // Actualizar el inventario restante
    setInventarioRestante((prev) => ({
      ...prev,
      [productoId]: disponible - cantidad,
    }))

    setCantidades((prev) => ({
      ...prev,
      [productoId]: valor,
    }))
  }

  // Manejar la confirmación de entrega
  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      // Convertir cantidades a números para la API
      const cantidadesNumero = Object.entries(cantidades).reduce(
        (acc, [key, value]) => {
          acc[key] = value === "" ? 0 : typeof value === "string" ? Number.parseInt(value, 10) : value
          return acc
        },
        {} as Record<string, number>,
      )

      // Verificar si se ha seleccionado al menos un producto
      const hayProductos = Object.values(cantidadesNumero).some((cantidad) => cantidad > 0)
      if (!hayProductos) {
        showToast("Debes seleccionar al menos un producto", "error")
        setIsSubmitting(false)
        return
      }

      // Llamar a la función de confirmación con las cantidades convertidas a números
      onConfirm(cantidadesNumero)

      // Cerrar el modal
      onClose()
    } catch (error) {
      console.error("Error al confirmar entrega:", error)
      showToast("Error al confirmar la entrega", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Formatear precio como moneda
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)} MXN`
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
              className="relative w-full max-w-md mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl backdrop-blur-sm bg-black/90 text-white"
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

              {/* Contenido del modal */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-center mb-2">Entrega de Productos</h2>
                <p className="text-gray-400 text-center mb-4">
                  Cliente: <span className="text-white">{cliente.local}</span>
                </p>

                {isLoadingInventario || isLoadingPrecios ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                    <span>Cargando datos...</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 mb-6">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-200">
                          Ingresa la cantidad de cada producto entregado. Estas cantidades se restarán del inventario
                          disponible.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {PRODUCTOS.map((producto) => {
                        const { precio, esPersonalizado } = getPrecioProducto(producto.id)
                        const subtotal = calcularSubtotal(producto.id)

                        return (
                          <div key={producto.id} className="p-3 border border-gray-800 rounded-lg bg-gray-900/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-400" />
                                <span className="font-medium">{producto.nombre}</span>
                              </div>
                              <div className="text-sm">
                                <span className={`${esPersonalizado ? "text-green-400" : "text-gray-400"}`}>
                                  {formatCurrency(precio)}
                                  {esPersonalizado && " (Personalizado)"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                  Disponible: {inventarioRestante[producto.id] || 0}
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={cantidades[producto.id] || ""}
                                  onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                                  placeholder="0"
                                  className="w-16 py-1 px-2 text-center rounded border text-white bg-gray-800 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>

                              {subtotal > 0 && (
                                <div className="flex items-center gap-1 text-sm font-medium text-green-400">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(subtotal)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total */}
                    <div className="bg-gray-800 p-3 rounded-lg mb-6">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold text-green-400">{formatCurrency(calcularTotal())}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Confirmar Entrega
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return modalContent
}
