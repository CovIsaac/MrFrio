"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  Search,
  Users,
  CalendarDays,
  FileText,
  Download,
  FileSpreadsheet,
  Snowflake,
  ArrowLeft,
} from "lucide-react"
import { format, subDays, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { AppleToggle } from "@/components/apple-toggle"

type TimeRange = "today" | "yesterday" | "lastWeek" | "custom"

interface Rutero {
  id: number
  nombre: string
  telefono: string
  activo: boolean
}

interface Cliente {
  id: string
  local: string
  telefono: string
  direccion: string
  tiene_refrigerador: boolean
  activo: boolean
}

interface Producto {
  id: string
  nombre: string
  precio: number
}

interface SalidaEfectivo {
  id: number
  rutero_id: number
  fecha: string
  motivo: string
  monto: number
}

interface PedidoDetalle {
  id: number
  fecha: string
  rutero: string
  cliente: string
  productos: Array<{
    nombre: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }>
  total: number
}

interface ProductoResumen {
  nombre: string
  cantidad_total: number
  precio_unitario: number
  total_vendido: number
}

interface DateRange {
  from: Date
  to: Date
}

export default function SalesReports() {
  const [selectedRutero, setSelectedRutero] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("today")
  const [selectedCliente, setSelectedCliente] = useState<string>("all")
  const [filtroRefrigerador, setFiltroRefrigerador] = useState<boolean>(false)
  const [incluirSalidasEfectivo, setIncluirSalidasEfectivo] = useState<boolean>(false)
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  })
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false)
  const [reporteGenerado, setReporteGenerado] = useState<boolean>(false)

  // Datos de ejemplo basados en tu BD
  const ruteros: Rutero[] = [
    { id: 1, nombre: "Juan Pérez", telefono: "(444) 123-4567", activo: true },
    { id: 2, nombre: "María González", telefono: "(444) 234-5678", activo: true },
    { id: 3, nombre: "Carlos Rodríguez", telefono: "(444) 345-6789", activo: true },
    { id: 4, nombre: "Ana Martínez", telefono: "(444) 456-7890", activo: true },
  ]

  const clientes: Cliente[] = [
    {
      id: "c_1747580719024_37",
      local: "Bar Animaniacs",
      telefono: "(123) 123-1231",
      direccion: "Bar Animaniacs Industrias",
      tiene_refrigerador: false,
      activo: true,
    },
    {
      id: "c_1747763130038_92",
      local: "Abarrotes Oscarín",
      telefono: "(481) 123-7457",
      direccion: "Av. Nicolas Zapata 1180",
      tiene_refrigerador: true,
      activo: true,
    },
    {
      id: "c_1747763371794_284",
      local: "Pizza Clasica Zapata",
      telefono: "(444) 215-4878",
      direccion: "Av. Nicolas Zapata 200",
      tiene_refrigerador: false,
      activo: true,
    },
    {
      id: "c_1747609555185_491",
      local: "Casa de Iker",
      telefono: "(486) 110-0787",
      direccion: "Av. Coras 197",
      tiene_refrigerador: true,
      activo: true,
    },
  ]

  const productos: Producto[] = [
    { id: "gourmet15", nombre: "GOURMET 15KG", precio: 150.0 },
    { id: "gourmet5", nombre: "GOURMET 5KG", precio: 60.0 },
    { id: "barraHielo", nombre: "BARRA HIELO", precio: 30.0 },
    { id: "mediaBarra", nombre: "MEDIA BARRA", precio: 15.0 },
    { id: "premium", nombre: "PREMIUM", precio: 200.0 },
  ]

  const salidasEfectivo: SalidaEfectivo[] = [
    { id: 1, rutero_id: 1, fecha: "2025-05-29", motivo: "Gasolina", monto: 500.0 },
    { id: 2, rutero_id: 1, fecha: "2025-05-29", motivo: "Almuerzo", monto: 150.0 },
    { id: 3, rutero_id: 2, fecha: "2025-05-29", motivo: "Mantenimiento vehículo", monto: 800.0 },
  ]

  // Datos de ejemplo para el reporte
  const pedidosDetalle: PedidoDetalle[] = [
    {
      id: 1001,
      fecha: "2025-05-29",
      rutero: "Juan Pérez",
      cliente: "Bar Animaniacs",
      productos: [
        { nombre: "GOURMET 15KG", cantidad: 12, precio_unitario: 150.0, subtotal: 1800.0 },
        { nombre: "GOURMET 5KG", cantidad: 11, precio_unitario: 60.0, subtotal: 660.0 },
        { nombre: "BARRA HIELO", cantidad: 13, precio_unitario: 30.0, subtotal: 390.0 },
        { nombre: "MEDIA BARRA", cantidad: 14, precio_unitario: 15.0, subtotal: 210.0 },
        { nombre: "PREMIUM", cantidad: 1, precio_unitario: 200.0, subtotal: 200.0 },
      ],
      total: 3260.0,
    },
    {
      id: 1002,
      fecha: "2025-05-29",
      rutero: "Juan Pérez",
      cliente: "Abarrotes Oscarín",
      productos: [
        { nombre: "GOURMET 15KG", cantidad: 5, precio_unitario: 150.0, subtotal: 750.0 },
        { nombre: "BARRA HIELO", cantidad: 8, precio_unitario: 30.0, subtotal: 240.0 },
      ],
      total: 990.0,
    },
    {
      id: 1003,
      fecha: "2025-05-29",
      rutero: "María González",
      cliente: "Casa de Iker",
      productos: [
        { nombre: "GOURMET 5KG", cantidad: 8, precio_unitario: 60.0, subtotal: 480.0 },
        { nombre: "MEDIA BARRA", cantidad: 10, precio_unitario: 15.0, subtotal: 150.0 },
        { nombre: "PREMIUM", cantidad: 2, precio_unitario: 200.0, subtotal: 400.0 },
      ],
      total: 1030.0,
    },
  ]

  // Función para obtener el rango de fechas según la selección
  const getDateRange = (range: TimeRange): DateRange => {
    const today = new Date()

    switch (range) {
      case "today":
        return { from: today, to: today }
      case "yesterday":
        const yesterday = subDays(today, 1)
        return { from: yesterday, to: yesterday }
      case "lastWeek":
        return {
          from: startOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
          to: endOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
        }
      case "custom":
        return customDateRange
      default:
        return { from: today, to: today }
    }
  }

  // Función para obtener el texto del rango seleccionado
  const getRangeText = (range: TimeRange): string => {
    switch (range) {
      case "today":
        return "Hoy"
      case "yesterday":
        return "Ayer"
      case "lastWeek":
        return "Última Semana"
      case "custom":
        if (dateFrom && dateTo) {
          return `${format(dateFrom, "dd/MM/yyyy")} - ${format(dateTo, "dd/MM/yyyy")}`
        }
        return "Rango Personalizado"
      default:
        return "Hoy"
    }
  }

  // Aplicar rango personalizado
  const applyCustomRange = () => {
    if (dateFrom && dateTo) {
      setCustomDateRange({ from: dateFrom, to: dateTo })
      setTimeRange("custom")
      setIsCustomRangeOpen(false)
    }
  }

  // Filtrar datos según selecciones
  const getFilteredData = () => {
    let filtered = [...pedidosDetalle]

    // Filtrar por repartidor
    if (selectedRutero !== "all") {
      const ruteroNombre = ruteros.find((r) => r.id.toString() === selectedRutero)?.nombre
      filtered = filtered.filter((pedido) => pedido.rutero === ruteroNombre)
    }

    // Filtrar por cliente
    if (selectedCliente !== "all") {
      const clienteNombre = clientes.find((c) => c.id === selectedCliente)?.local
      filtered = filtered.filter((pedido) => pedido.cliente === clienteNombre)
    }

    // Filtrar por refrigerador
    if (filtroRefrigerador) {
      const clientesConRefrigerador = clientes.filter((c) => c.tiene_refrigerador).map((c) => c.local)
      filtered = filtered.filter((pedido) => clientesConRefrigerador.includes(pedido.cliente))
    }

    return filtered
  }

  // Calcular resumen de productos
  const getProductosResumen = (pedidos: PedidoDetalle[]): ProductoResumen[] => {
    const resumen: { [key: string]: ProductoResumen } = {}

    pedidos.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        if (!resumen[producto.nombre]) {
          resumen[producto.nombre] = {
            nombre: producto.nombre,
            cantidad_total: 0,
            precio_unitario: producto.precio_unitario,
            total_vendido: 0,
          }
        }
        resumen[producto.nombre].cantidad_total += producto.cantidad
        resumen[producto.nombre].total_vendido += producto.subtotal
      })
    })

    return Object.values(resumen)
  }

  // Calcular salidas de efectivo
  const getSalidasEfectivo = () => {
    if (!incluirSalidasEfectivo) return []

    let salidas = [...salidasEfectivo]

    // Filtrar por repartidor si está seleccionado
    if (selectedRutero !== "all") {
      salidas = salidas.filter((salida) => salida.rutero_id.toString() === selectedRutero)
    }

    // Aquí agregarías filtro por fecha cuando conectes con la API

    return salidas
  }

  const handleGenerateReport = () => {
    console.log("Generando reporte con filtros:", {
      rutero: selectedRutero,
      timeRange: timeRange,
      cliente: selectedCliente,
      filtroRefrigerador,
      incluirSalidasEfectivo,
      dateRange: getDateRange(timeRange),
    })
    // Cambiar el estado para mostrar las tablas
    setReporteGenerado(true)
  }

  const exportToExcel = () => {
    console.log("Exportando a Excel...")
    // Aquí implementarías la lógica de exportación a Excel
    alert("Funcionalidad de exportar a Excel - Por implementar")
  }

  const exportToPDF = () => {
    console.log("Exportando a PDF...")
    // Aquí implementarías la lógica de exportación a PDF
    alert("Funcionalidad de exportar a PDF - Por implementar")
  }

  const filteredPedidos = getFilteredData()
  const productosResumen = getProductosResumen(filteredPedidos)
  const salidasEfectivoFiltradas = getSalidasEfectivo()
  const totalVentas = filteredPedidos.reduce((sum, pedido) => sum + pedido.total, 0)
  const totalSalidas = salidasEfectivoFiltradas.reduce((sum, salida) => sum + salida.monto, 0)
  const totalNeto = totalVentas - totalSalidas

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header con botón de regreso */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Inicio
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                <Snowflake className="h-10 w-10 text-blue-400" />
                Reporte De Ventas
              </h1>
              <p className="text-blue-200 mt-2">
                Configura los filtros y genera reportes detallados de ventas por período
              </p>
            </div>
          </div>
        </div>

        {/* Módulo de Filtros */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="h-5 w-5 text-blue-400" />
              Configuración de Filtros
            </CardTitle>
            <CardDescription className="text-blue-200">
              Selecciona los parámetros para generar tu reporte personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Primera fila: Repartidor y Rango de Tiempo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selección de Repartidor */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-blue-400" />
                  Seleccionar Repartidor
                </Label>
                <Select value={selectedRutero} onValueChange={setSelectedRutero}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecciona un repartidor" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        Todos los Repartidores
                      </div>
                    </SelectItem>
                    {ruteros
                      .filter((rutero) => rutero.activo)
                      .map((rutero) => (
                        <SelectItem
                          key={rutero.id}
                          value={rutero.id.toString()}
                          className="text-white hover:bg-gray-700"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{rutero.nombre}</span>
                            <span className="text-xs text-blue-300">{rutero.telefono}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selección de Rango de Tiempo */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2 text-white">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  Rango de Tiempo
                </Label>
                <div className="flex gap-2">
                  <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                    <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="today" className="text-white hover:bg-gray-700">
                        Hoy
                      </SelectItem>
                      <SelectItem value="yesterday" className="text-white hover:bg-gray-700">
                        Ayer
                      </SelectItem>
                      <SelectItem value="lastWeek" className="text-white hover:bg-gray-700">
                        Última Semana
                      </SelectItem>
                      <SelectItem value="custom" className="text-white hover:bg-gray-700">
                        Rango Personalizado
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {timeRange === "custom" && (
                    <Dialog open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="default"
                          className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          Fechas
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Seleccionar Rango Personalizado</DialogTitle>
                          <DialogDescription className="text-blue-200">
                            Elige las fechas desde y hasta para tu reporte de ventas
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                          <div className="space-y-3">
                            <Label className="text-white">Fecha Desde</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                                <Calendar
                                  mode="single"
                                  selected={dateFrom}
                                  onSelect={setDateFrom}
                                  initialFocus
                                  locale={es}
                                  className="bg-gray-800 text-white"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-white">Fecha Hasta</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                                <Calendar
                                  mode="single"
                                  selected={dateTo}
                                  onSelect={setDateTo}
                                  initialFocus
                                  locale={es}
                                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                                  className="bg-gray-800 text-white"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsCustomRangeOpen(false)}
                            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={applyCustomRange}
                            disabled={!dateFrom || !dateTo}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Aplicar Rango
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <p className="text-sm text-blue-300">Período: {getRangeText(timeRange)}</p>
              </div>
            </div>

            {/* Segunda fila: Cliente */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-blue-400" />
                Seleccionar Cliente
              </Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      Todos los Clientes
                    </div>
                  </SelectItem>
                  {clientes
                    .filter((cliente) => cliente.activo)
                    .map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id} className="text-white hover:bg-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.local}</span>
                          <span className="text-xs text-blue-300">
                            {cliente.direccion} {cliente.tiene_refrigerador && "• Con Refrigerador"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tercera fila: Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Toggle Refrigerador */}
              <AppleToggle
                checked={filtroRefrigerador}
                onCheckedChange={(checked) => {
                  console.log("Cambiando filtro refrigerador a:", checked)
                  setFiltroRefrigerador(checked)
                }}
                label="Filtrar por Refrigerador"
                description="Mostrar solo clientes que tienen refrigerador asignado"
              />

              {/* Toggle Salidas de Efectivo */}
              <AppleToggle
                checked={incluirSalidasEfectivo}
                onCheckedChange={(checked) => {
                  console.log("Cambiando incluir salidas a:", checked)
                  setIncluirSalidasEfectivo(checked)
                }}
                label="Incluir Salidas de Efectivo"
                description="Mostrar descuentos por gastos autorizados del repartidor"
              />
            </div>

            {/* Botón Generar Reporte */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleGenerateReport}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4" />
                Generar Reporte
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados del Reporte - Solo se muestran después de generar */}
        {reporteGenerado && (
          <>
            {/* Tabla Principal de Pedidos */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Detalle de Ventas</CardTitle>
                    <CardDescription className="text-blue-200">
                      Reporte generado para {getRangeText(timeRange)} •{" "}
                      {selectedRutero === "all"
                        ? "Todos los repartidores"
                        : ruteros.find((r) => r.id.toString() === selectedRutero)?.nombre}{" "}
                      •{" "}
                      {selectedCliente === "all"
                        ? "Todos los clientes"
                        : clientes.find((c) => c.id === selectedCliente)?.local}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-400" />
                      Excel
                    </Button>
                    <Button
                      onClick={exportToPDF}
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4 text-red-400" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800">
                        <TableHead className="text-blue-300">No. Pedido</TableHead>
                        <TableHead className="text-blue-300">Fecha</TableHead>
                        <TableHead className="text-blue-300">Repartidor</TableHead>
                        <TableHead className="text-blue-300">Cliente</TableHead>
                        <TableHead className="text-blue-300">Refrigerador</TableHead>
                        <TableHead className="text-blue-300">Productos Vendidos</TableHead>
                        <TableHead className="text-right text-blue-300">Total Venta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPedidos.map((pedido) => (
                        <TableRow key={pedido.id} className="border-gray-700 hover:bg-gray-800">
                          <TableCell className="font-medium text-white">#{pedido.id}</TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(pedido.fecha), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="text-gray-300">{pedido.rutero}</TableCell>
                          <TableCell className="text-gray-300">{pedido.cliente}</TableCell>
                          <TableCell>
                            {clientes.find((c) => c.local === pedido.cliente)?.tiene_refrigerador ? (
                              <span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-medium">
                                Sí
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-md bg-gray-700/40 text-gray-400 text-xs font-medium">
                                No
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pedido.productos.map((producto, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium text-white">{producto.nombre}</span> -{" "}
                                  {producto.cantidad} unidades
                                  <span className="text-blue-300 ml-2">
                                    (${producto.precio_unitario} c/u = ${producto.subtotal})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-400">
                            ${pedido.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totales */}
                <div className="mt-6 space-y-2">
                  <Separator className="bg-gray-700" />
                  <div className="flex justify-end space-y-2">
                    <div className="text-right space-y-1">
                      <div className="flex justify-between items-center min-w-[300px]">
                        <span className="font-medium text-white">Total de Ventas:</span>
                        <span className="font-bold text-lg text-green-400">${totalVentas.toLocaleString()}</span>
                      </div>

                      {incluirSalidasEfectivo && salidasEfectivoFiltradas.length > 0 && (
                        <>
                          <div className="flex justify-between items-center min-w-[300px] text-red-400">
                            <span>Salidas de Efectivo:</span>
                            <span>-${totalSalidas.toLocaleString()}</span>
                          </div>
                          <Separator className="bg-gray-700" />
                          <div className="flex justify-between items-center min-w-[300px]">
                            <span className="font-bold text-white">Total Neto:</span>
                            <span className="font-bold text-xl text-blue-400">${totalNeto.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Salidas de Efectivo */}
            {incluirSalidasEfectivo && salidasEfectivoFiltradas.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">Salidas de Efectivo</CardTitle>
                  <CardDescription className="text-blue-200">
                    Gastos autorizados para el período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="rounded-md border border-gray-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-800">
                          <TableHead className="text-blue-300">Fecha</TableHead>
                          <TableHead className="text-blue-300">Repartidor</TableHead>
                          <TableHead className="text-blue-300">Motivo</TableHead>
                          <TableHead className="text-right text-blue-300">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salidasEfectivoFiltradas.map((salida) => (
                          <TableRow key={salida.id} className="border-gray-700 hover:bg-gray-800">
                            <TableCell className="text-gray-300">
                              {format(new Date(salida.fecha), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {ruteros.find((r) => r.id === salida.rutero_id)?.nombre}
                            </TableCell>
                            <TableCell className="text-gray-300">{salida.motivo}</TableCell>
                            <TableCell className="text-right font-medium text-red-400">
                              ${salida.monto.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabla de Resumen de Productos */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white">Resumen de Productos Vendidos</CardTitle>
                <CardDescription className="text-blue-200">Cantidad total vendida por tipo de producto</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800">
                        <TableHead className="text-blue-300">Producto</TableHead>
                        <TableHead className="text-center text-blue-300">Cantidad Vendida</TableHead>
                        <TableHead className="text-right text-blue-300">Precio Unitario</TableHead>
                        <TableHead className="text-right text-blue-300">Total Vendido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosResumen.map((producto) => (
                        <TableRow key={producto.nombre} className="border-gray-700 hover:bg-gray-800">
                          <TableCell className="font-medium text-white">{producto.nombre}</TableCell>
                          <TableCell className="text-center text-gray-300">
                            {producto.cantidad_total} unidades
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            ${producto.precio_unitario.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-400">
                            ${producto.total_vendido.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
