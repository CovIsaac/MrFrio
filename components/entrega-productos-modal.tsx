"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Package, Check, AlertCircle, DollarSign, CreditCard } from "lucide-react"
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

// Actualizar la estructura de CreditoInfo para que coincida con los campos del cliente
type CreditoInfo = {
  limite_credito: number
  credito_usado: number
  credito_disponible: number
}

type EntregaProductosModalProps = {
  isOpen: boolean
  onClose: () => void
  cliente: {
    id: string
    local: string
  }
  rutaId: string
  onConfirm: (cantidades: Record<string, number>, creditoUsado?: number) => void
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
  const [creditoInfo, setCreditoInfo] = useState<CreditoInfo | null>(null)
  const [isLoadingCredito, setIsLoadingCredito] = useState(false)
  const [usarCredito, setUsarCredito] = useState(false)
  const [cantidadCredito, setCantidadCredito] = useState("")
  const { showToast } = useToast()

  // Verificar que los props se reciben correctamente
  useEffect(() => {
    console.log("EntregaProductosModal props:", { cliente, rutaId, isOpen })
  }, [cliente, rutaId, isOpen])

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

      // Cargar información de crédito
      cargarInfoCredito()

      // Reiniciar valores de crédito
      setUsarCredito(false)
      setCantidadCredito("")
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

  // Cargar información de crédito del cliente
  const cargarInfoCredito = async () => {
    setIsLoadingCredito(true)
    try {
      console.log("Cargando información de crédito para el cliente:", cliente.id)
      const response = await fetch(`/api/credito/cliente?clienteId=${cliente.id}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Respuesta completa de la API de crédito:", JSON.stringify(data, null, 2))

        // Extraer la información de crédito de la respuesta
        // La API podría devolver los datos en diferentes estructuras
        let creditoData: CreditoInfo | null = null

        // Caso 1: Los datos están directamente en la respuesta
        if (
          typeof data.limite_credito !== "undefined" &&
          typeof data.credito_usado !== "undefined" &&
          typeof data.credito_disponible !== "undefined"
        ) {
          creditoData = {
            limite_credito: Number(data.limite_credito || 0),
            credito_usado: Number(data.credito_usado || 0),
            credito_disponible: Number(data.credito_disponible || 0),
          }
        }
        // Caso 2: Los datos están en un objeto 'credito'
        else if (data.credito) {
          creditoData = {
            limite_credito: Number(data.credito.limite_credito || 0),
            credito_usado: Number(data.credito.credito_usado || 0),
            credito_disponible: Number(data.credito.credito_disponible || 0),
          }
        }
        // Caso 3: Los datos están en un objeto con otro nombre
        else {
          // Buscar en todas las propiedades de la respuesta
          for (const key in data) {
            const obj = data[key]
            if (
              obj &&
              typeof obj === "object" &&
              typeof obj.limite_credito !== "undefined" &&
              typeof obj.credito_usado !== "undefined" &&
              typeof obj.credito_disponible !== "undefined"
            ) {
              creditoData = {
                limite_credito: Number(obj.limite_credito || 0),
                credito_usado: Number(obj.credito_usado || 0),
                credito_disponible: Number(obj.credito_disponible || 0),
              }
              break
            }
          }
        }

        // Si no se encontró la información en ninguna estructura conocida
        if (!creditoData) {
          console.error("No se pudo extraer la información de crédito de la respuesta:", data)
          creditoData = { limite_credito: 0, credito_usado: 0, credito_disponible: 0 }
        }

        console.log("Información de crédito extraída:", creditoData)
        setCreditoInfo(creditoData)
      } else {
        console.error("Error al cargar información de crédito. Status:", response.status)
        // Si hay un error, inicializar con valores por defecto para que la UI siga funcionando
        setCreditoInfo({ limite_credito: 0, credito_usado: 0, credito_disponible: 0 })
      }
    } catch (error) {
      console.error("Error al cargar información de crédito:", error)
      // Si hay un error, inicializar con valores por defecto para que la UI siga funcionando
      setCreditoInfo({ limite_credito: 0, credito_usado: 0, credito_disponible: 0 })
    } finally {
      setIsLoadingCredito(false)
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

  // Calcular el total a pagar después de aplicar el crédito
  const calcularTotalConCredito = (): number => {
    const total = calcularTotal()
    if (!usarCredito || cantidadCredito === "") return total

    const creditoAplicado = Number.parseFloat(cantidadCredito) || 0
    return Math.max(0, total - creditoAplicado)
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

  // Manejar cambio en la cantidad de crédito
  const handleCreditoChange = (valor: string) => {
    console.log("handleCreditoChange llamado con valor:", valor)

    // Si el valor está vacío, permitirlo
    if (valor === "") {
      setCantidadCredito("")
      return
    }

    // Permitir números con hasta 2 decimales (más flexible)
    // Acepta: "123", "123.1", "123.12", "0.1", ".1"
    if (!/^(\d*\.?\d{0,2}|\.\d{1,2})$/.test(valor)) {
      console.log("Valor rechazado por regex:", valor)
      return
    }

    // Actualizar el estado con el valor ingresado
    setCantidadCredito(valor)

    // Realizar validaciones después de actualizar el estado
    const cantidad = Number.parseFloat(valor)

    // Si no es un número válido, no hacer más validaciones
    if (isNaN(cantidad)) return

    // Validar que no sea negativo
    if (cantidad < 0) {
      setCantidadCredito("0")
      return
    }

    // Validar que no exceda el crédito disponible (solo si es un número válido)
    if (creditoInfo && !isNaN(cantidad) && cantidad > creditoInfo.credito_disponible) {
      // No actualizar inmediatamente para permitir seguir escribiendo
      // Solo actualizar si se excede por mucho o al perder el foco
      if (cantidad > creditoInfo.credito_disponible * 1.5) {
        setCantidadCredito(creditoInfo.credito_disponible.toString())
      }
    }

    // Validar que no exceda el total (solo si es un número válido)
    const total = calcularTotal()
    if (!isNaN(cantidad) && cantidad > total) {
      // No actualizar inmediatamente para permitir seguir escribiendo
      // Solo actualizar si se excede por mucho o al perder el foco
      if (cantidad > total * 1.5) {
        setCantidadCredito(total.toString())
      }
    }
  }

  // Validar el valor de crédito al perder el foco
  const handleCreditoBlur = () => {
    if (cantidadCredito === "") return

    let cantidad = Number.parseFloat(cantidadCredito)
    if (isNaN(cantidad)) {
      setCantidadCredito("0")
      return
    }

    // Asegurarse de que no sea negativo
    cantidad = Math.max(0, cantidad)

    // Asegurarse de que no exceda el crédito disponible
    if (creditoInfo) {
      cantidad = Math.min(cantidad, creditoInfo.credito_disponible)
    }

    // Asegurarse de que no exceda el total
    const total = calcularTotal()
    cantidad = Math.min(cantidad, total)

    // Formatear a 2 decimales
    setCantidadCredito(cantidad.toFixed(2).replace(/\.00$/, ""))
  }

  // Usar el máximo crédito disponible
  const usarMaximoCredito = () => {
    if (!creditoInfo) return

    const total = calcularTotal()
    const maximo = Math.min(creditoInfo.credito_disponible, total)
    setCantidadCredito(maximo.toString())
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

      // Verificar si se usa crédito
      let creditoUsado: number | undefined = undefined
      if (usarCredito && cantidadCredito !== "") {
        creditoUsado = Number.parseFloat(cantidadCredito)

        // Validar que el crédito no exceda el disponible
        if (creditoInfo && creditoUsado > creditoInfo.credito_disponible) {
          showToast("El crédito usado no puede exceder el disponible", "error")
          setIsSubmitting(false)
          return
        }

        // Validar que el crédito no exceda el total
        const total = calcularTotal()
        if (creditoUsado > total) {
          showToast("El crédito usado no puede exceder el total", "error")
          setIsSubmitting(false)
          return
        }
      }

      // Llamar a la función de confirmación con las cantidades y el crédito usado
      onConfirm(cantidadesNumero, creditoUsado)

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
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) {
      return "$0.00 MXN"
    }
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

                {isLoadingInventario || isLoadingPrecios || isLoadingCredito ? (
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

                    {/* Sección de Crédito */}
                    {creditoInfo && (
                      <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-400" />
                            <span className="font-medium">Crédito Disponible:</span>
                          </div>
                          <span className="text-blue-300 font-semibold">
                            {formatCurrency(creditoInfo?.credito_disponible || 0)}
                          </span>
                        </div>

                        {/* Mostrar información adicional de crédito */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-300">
                          <div>Límite de crédito:</div>
                          <div className="text-right">{formatCurrency(creditoInfo?.limite_credito || 0)}</div>
                          <div>Crédito usado:</div>
                          <div className="text-right">{formatCurrency(creditoInfo?.credito_usado || 0)}</div>
                        </div>

                        <div className="flex items-center mb-3">
                          <input
                            type="checkbox"
                            id="usarCredito"
                            checked={usarCredito}
                            onChange={(e) => {
                              setUsarCredito(e.target.checked)
                              if (e.target.checked) {
                                // Inicializar con el mínimo entre el disponible y el precio total
                                const creditoInicial = Math.min(creditoInfo.credito_disponible, calcularTotal())
                                setCantidadCredito(creditoInicial.toString())
                              } else {
                                setCantidadCredito("")
                              }
                            }}
                            className="h-4 w-4 rounded border-blue-800 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                          />
                          <label htmlFor="usarCredito" className="ml-2 text-sm text-blue-200">
                            Usar crédito para este pedido
                          </label>
                        </div>

                        {usarCredito && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label htmlFor="cantidadCredito" className="block text-sm font-medium text-blue-200 mb-1">
                                Cantidad de crédito a utilizar:
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-grow">
                                  <DollarSign className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                                  <input
                                    type="text"
                                    id="cantidadCredito"
                                    inputMode="decimal"
                                    value={cantidadCredito}
                                    onChange={(e) => handleCreditoChange(e.target.value)}
                                    onBlur={handleCreditoBlur}
                                    placeholder="0.00"
                                    className="w-full py-1.5 pl-9 pr-3 rounded border text-white bg-gray-800 border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={usarMaximoCredito}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                >
                                  Máx
                                </button>
                              </div>
                            </div>

                            {cantidadCredito !== "" && Number.parseFloat(cantidadCredito) > 0 && (
                              <div className="bg-blue-900/30 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-200">Total a pagar:</span>
                                  <span className="font-bold text-blue-300">
                                    {formatCurrency(calcularTotalConCredito())}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
