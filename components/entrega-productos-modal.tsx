"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Package, Check, AlertCircle } from "lucide-react"
import { useToast } from "./toast-notification"

// Tipos de productos disponibles
const PRODUCTOS = [
  { id: "gourmet15", nombre: "GOURMET 15KG" },
  { id: "gourmet5", nombre: "GOURMET 5KG" },
  { id: "barraHielo", nombre: "BARRA HIELO" },
  { id: "mediaBarra", nombre: "MEDIA BARRA" },
  { id: "premium", nombre: "PREMIUM" },
]

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
    }
  }, [isOpen, rutaId])

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

                {isLoadingInventario ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                    <span>Cargando inventario disponible...</span>
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
                      {PRODUCTOS.map((producto) => (
                        <div key={producto.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-400" />
                            <span>{producto.nombre}</span>
                          </div>
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
                        </div>
                      ))}
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
