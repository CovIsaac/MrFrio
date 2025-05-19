"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClienteSearch } from "./cliente-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Loader2, Store, Save, Trash2, RefreshCw } from "lucide-react"
import { useToast } from "./toast-notification"

type Cliente = {
  id: string
  local: string
  direccion: string
  telefono?: string
  isExtra?: boolean
}

type Producto = {
  id: string
  nombre: string
  precio_base: number
}

type PrecioPersonalizado = {
  producto_id: string
  precio: number
  producto_nombre: string
  precio_base: number
}

export function PreciosContent() {
  const [activeTab, setActiveTab] = useState("precios-base")
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoadingProductos, setIsLoadingProductos] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [preciosPersonalizados, setPreciosPersonalizados] = useState<Record<string, number>>({})
  const [isLoadingPreciosPersonalizados, setIsLoadingPreciosPersonalizados] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedPrecios, setEditedPrecios] = useState<Record<string, string>>({})
  const [editedPreciosBase, setEditedPreciosBase] = useState<Record<string, string>>({})
  const [isSavingBase, setIsSavingBase] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

  // Memoizar la función de carga de productos para evitar recreaciones
  const cargarProductos = useCallback(async () => {
    setIsLoadingProductos(true)
    try {
      const response = await fetch("/api/precios/base")
      if (response.ok) {
        const data = await response.json()
        // Convertir precio_base a número
        const productosConPrecioNumerico = data.map((producto: any) => ({
          ...producto,
          precio_base: Number(producto.precio_base) || 0,
        }))
        setProductos(productosConPrecioNumerico)

        // Inicializar los precios base editables
        const preciosBase: Record<string, string> = {}
        productosConPrecioNumerico.forEach((producto: Producto) => {
          preciosBase[producto.id] = producto.precio_base.toString()
        })
        setEditedPreciosBase(preciosBase)
      } else {
        console.error("Error al cargar productos")
      }
    } catch (error) {
      console.error("Error al cargar productos:", error)
    } finally {
      setIsLoadingProductos(false)
    }
  }, [])

  // Cargar productos solo una vez al montar el componente
  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  // Cargar precios personalizados cuando se selecciona un cliente
  useEffect(() => {
    if (!selectedCliente) {
      setPreciosPersonalizados({})
      setEditedPrecios({})
      return
    }

    // Verificar que tengamos productos cargados
    if (productos.length === 0) return

    const cargarPreciosPersonalizados = async () => {
      setIsLoadingPreciosPersonalizados(true)
      try {
        const response = await fetch(`/api/precios/cliente?clienteId=${selectedCliente.id}`)
        if (response.ok) {
          const data: PrecioPersonalizado[] = await response.json()

          // Convertir los datos a un objeto para facilitar el acceso
          const precios: Record<string, number> = {}
          data.forEach((item) => {
            precios[item.producto_id] = Number(item.precio) || 0
          })
          setPreciosPersonalizados(precios)

          // Inicializar precios editables con los precios personalizados o precios base
          const preciosEditables: Record<string, string> = {}
          productos.forEach((producto) => {
            if (precios[producto.id] !== undefined) {
              preciosEditables[producto.id] = precios[producto.id].toString()
            } else {
              preciosEditables[producto.id] = ""
            }
          })
          setEditedPrecios(preciosEditables)
        } else {
          console.error("Error al cargar precios personalizados")
        }
      } catch (error) {
        console.error("Error al cargar precios personalizados:", error)
      } finally {
        setIsLoadingPreciosPersonalizados(false)
      }
    }

    cargarPreciosPersonalizados()
  }, [selectedCliente, productos])

  // Cambiar el precio personalizado de un producto
  const handlePrecioChange = (productoId: string, valor: string) => {
    // Validar que sea un número válido o vacío
    if (valor === "" || /^\d+(\.\d{0,2})?$/.test(valor)) {
      setEditedPrecios((prev) => ({
        ...prev,
        [productoId]: valor,
      }))
    }
  }

  // Cambiar el precio base de un producto
  const handlePrecioBaseChange = (productoId: string, valor: string) => {
    // Validar que sea un número válido
    if (valor === "" || /^\d+(\.\d{0,2})?$/.test(valor)) {
      setEditedPreciosBase((prev) => ({
        ...prev,
        [productoId]: valor,
      }))
    }
  }

  // Guardar los precios personalizados
  const guardarPreciosPersonalizados = async () => {
    if (!selectedCliente) return

    setIsSaving(true)
    try {
      // Iterar sobre los precios editados y guardarlos
      for (const [productoId, precioStr] of Object.entries(editedPrecios)) {
        // Si el precio está vacío, continuar al siguiente
        if (precioStr.trim() === "") continue

        // Convertir el precio a número
        const precio = Number.parseFloat(precioStr)

        // Guardar el precio personalizado
        const response = await fetch("/api/precios/cliente", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clienteId: selectedCliente.id,
            productoId,
            precio,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Error al guardar precio para ${productoId}`)
        }
      }

      showToast("Precios personalizados guardados correctamente", "success")

      // Recargar los precios personalizados
      const response = await fetch(`/api/precios/cliente?clienteId=${selectedCliente.id}`)
      if (response.ok) {
        const data: PrecioPersonalizado[] = await response.json()

        // Convertir los datos a un objeto para facilitar el acceso
        const precios: Record<string, number> = {}
        data.forEach((item) => {
          precios[item.producto_id] = Number(item.precio) || 0
        })
        setPreciosPersonalizados(precios)
      }
    } catch (error) {
      console.error("Error al guardar precios personalizados:", error)
      showToast(error instanceof Error ? error.message : "Error al guardar precios personalizados", "error")
    } finally {
      setIsSaving(false)
    }
  }

  // Eliminar todos los precios personalizados del cliente
  const eliminarPreciosPersonalizados = async () => {
    if (!selectedCliente) return

    if (!confirm(`¿Estás seguro de eliminar todos los precios personalizados para ${selectedCliente.local}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      // Iterar sobre los productos y eliminar sus precios personalizados
      for (const producto of productos) {
        const response = await fetch(`/api/precios/cliente?clienteId=${selectedCliente.id}&productoId=${producto.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Error al eliminar precio para ${producto.id}`)
        }
      }

      showToast("Precios personalizados eliminados correctamente", "success")

      // Limpiar los precios personalizados
      setPreciosPersonalizados({})

      // Restablecer los precios editables
      const preciosEditables: Record<string, string> = {}
      productos.forEach((producto) => {
        preciosEditables[producto.id] = ""
      })
      setEditedPrecios(preciosEditables)
    } catch (error) {
      console.error("Error al eliminar precios personalizados:", error)
      showToast(error instanceof Error ? error.message : "Error al eliminar precios personalizados", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Guardar el precio base de un producto
  const guardarPrecioBase = async (productoId: string) => {
    const precioBaseStr = editedPreciosBase[productoId]

    // Validar que sea un número válido
    if (!precioBaseStr || !/^\d+(\.\d{0,2})?$/.test(precioBaseStr)) {
      showToast("Ingresa un precio base válido", "error")
      return
    }

    // Convertir el precio a número
    const precioBase = Number.parseFloat(precioBaseStr)

    // Actualizar el estado de guardado
    setIsSavingBase((prev) => ({
      ...prev,
      [productoId]: true,
    }))

    try {
      const response = await fetch("/api/precios/base", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productoId,
          precioBase,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar precio base")
      }

      showToast(`Precio base de ${productoId} actualizado correctamente`, "success")

      // Actualizar el producto en la lista
      setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, precio_base: precioBase } : p)))
    } catch (error) {
      console.error("Error al guardar precio base:", error)
      showToast(error instanceof Error ? error.message : "Error al guardar precio base", "error")
    } finally {
      // Actualizar el estado de guardado
      setIsSavingBase((prev) => ({
        ...prev,
        [productoId]: false,
      }))
    }
  }

  return (
    <div>
      <Tabs defaultValue="precios-base" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md mx-auto mb-8 grid-cols-2">
          <TabsTrigger value="precios-base">Precios Base</TabsTrigger>
          <TabsTrigger value="precios-cliente">Precios por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="precios-base" className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={cargarProductos}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar Productos
            </button>
          </div>

          {isLoadingProductos ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mr-3" />
              <span className="text-xl text-gray-300">Cargando productos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productos.map((producto) => (
                <Card key={producto.id} className="bg-gray-900/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center">
                      <DollarSign className="h-5 w-5 text-green-400 mr-2" />
                      {producto.nombre}
                    </CardTitle>
                    <CardDescription>
                      Precio base actual: ${Number(producto.precio_base).toFixed(2)} MXN
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={editedPreciosBase[producto.id] || ""}
                          onChange={(e) => handlePrecioBaseChange(producto.id, e.target.value)}
                          className="pl-10 py-2 w-full border border-gray-700 bg-gray-900 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`${Number(producto.precio_base).toFixed(2)}`}
                        />
                      </div>
                      <button
                        onClick={() => guardarPrecioBase(producto.id)}
                        disabled={isSavingBase[producto.id]}
                        className="inline-flex items-center justify-center h-9 rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingBase[producto.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="precios-cliente" className="space-y-4">
          <div className="mb-6 max-w-xl mx-auto">
            <h2 className="text-lg font-medium mb-2">Seleccionar Cliente</h2>
            <ClienteSearch
              onSelect={(cliente) => setSelectedCliente(cliente)}
              selectedClienteId={selectedCliente?.id}
            />
          </div>

          {selectedCliente && (
            <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/20 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center">
                    <Store className="h-5 w-5 text-blue-400 mr-2" />
                    {selectedCliente.local}
                  </h2>
                  <p className="text-sm text-gray-400">{selectedCliente.direccion}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={guardarPreciosPersonalizados}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Precios
                      </>
                    )}
                  </button>
                  <button
                    onClick={eliminarPreciosPersonalizados}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Todos
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isLoadingPreciosPersonalizados ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                  <span className="text-gray-300">Cargando precios personalizados...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productos.map((producto) => {
                      const tienePrecioPersonalizado = preciosPersonalizados[producto.id] !== undefined
                      return (
                        <Card key={producto.id} className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center">
                              <DollarSign className="h-5 w-5 text-green-400 mr-2" />
                              {producto.nombre}
                            </CardTitle>
                            <CardDescription className="flex flex-col">
                              <span>Precio base: ${Number(producto.precio_base).toFixed(2)} MXN</span>
                              {tienePrecioPersonalizado && (
                                <span className="text-green-400">
                                  Precio actual: ${Number(preciosPersonalizados[producto.id]).toFixed(2)} MXN
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="relative w-full">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={editedPrecios[producto.id] || ""}
                                onChange={(e) => handlePrecioChange(producto.id, e.target.value)}
                                className="pl-10 py-2 w-full border border-gray-700 bg-gray-900 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder={`Precio personalizado (base: ${Number(producto.precio_base).toFixed(2)})`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={guardarPreciosPersonalizados}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Precios
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedCliente && !isLoadingProductos && (
            <div className="text-center py-8 bg-gray-900/20 border border-gray-700 rounded-lg">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">Selecciona un cliente</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Selecciona un cliente para ver y editar sus precios personalizados. Si no hay precios personalizados, se
                utilizarán los precios base.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
