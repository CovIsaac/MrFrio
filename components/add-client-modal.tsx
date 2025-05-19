"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  UserPlus,
  Store,
  Phone,
  MapPin,
  Loader2,
  Snowflake,
  X,
  Calendar,
  Route,
  Refrigerator,
  Check,
  ChevronDown,
  Search,
  AlertCircle,
} from "lucide-react"

import { useToast } from "./toast-notification"

// Días de la semana en español
const DIAS_SEMANA = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
]

// Estado inicial del formulario
const initialFormState = {
  storeName: "",
  phone: "",
  address: "",
  diasVisita: {
    lunes: false,
    martes: false,
    miercoles: false,
    jueves: false,
    viernes: false,
    sabado: false,
    domingo: false,
  },
  ruta: "",
  tieneRefrigerador: false,
  capacidadRefrigerador: "",
  // Para Google Maps
  lat: 0,
  lng: 0,
  formattedAddress: "",
  mapUrl: "",
}

// Estado inicial de errores
const initialErrorsState = {
  storeName: "",
  phone: "",
  address: "",
  ruta: "",
  diasVisita: "",
  capacidadRefrigerador: "",
  mapError: "",
}

// Declarar la variable google para evitar el error de lint
declare global {
  interface Window {
    google?: typeof google.maps
  }
}

type Ruta = {
  id: string
  nombre: string
}

export function AddClientModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false) // Corregido: inicializado con false
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoadingRutas, setIsLoadingRutas] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [formData, setFormData] = useState({ ...initialFormState })
  const [errors, setErrors] = useState({ ...initialErrorsState })

  const { showToast, ToastContainer } = useToast()

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Cargar rutas cuando se abre el modal (solo una vez)
  useEffect(() => {
    async function fetchRutas() {
      if (!isOpen || dataLoaded) return

      setIsLoadingRutas(true)
      try {
        const response = await fetch("/api/rutas")
        if (response.ok) {
          const data = await response.json()
          // Filtrar la ruta LOCAL
          const rutasFiltradas = data.filter((ruta: Ruta) => ruta.id !== "LOCAL")
          setRutas(rutasFiltradas)
          setDataLoaded(true)
        } else {
          showToast("Error al cargar las rutas", "error")
        }
      } catch (error) {
        console.error("Error al cargar rutas:", error)
        showToast("Error al cargar las rutas", "error")
      } finally {
        setIsLoadingRutas(false)
      }
    }

    fetchRutas()
  }, [isOpen, dataLoaded, showToast])

  // Reiniciar el formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Reiniciar el formulario
      setFormData({ ...initialFormState })
      setErrors({ ...initialErrorsState })
      setDataLoaded(false)

      // Limpiar el mapa
      if (mapInstanceRef.current) {
        // Destruir el marcador
        if (markerRef.current) {
          markerRef.current.setMap(null)
          markerRef.current = null
        }

        // Reiniciar el mapa (no lo destruimos completamente para evitar recargar la API)
        mapInstanceRef.current = null
      }
    }
  }, [isOpen])

  // Bloquear el scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"

      // Cargar el script de Google Maps si el modal está abierto
      if (!window.google?.maps) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCnkkBzjxlpg7bh4ZxzMRtqV9YnUaFnYLg&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => {
          setMapLoaded(true)
        }
        document.head.appendChild(script)
      } else {
        setMapLoaded(true)
      }
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Inicializar el mapa cuando se carga la API
  useEffect(() => {
    if (mapLoaded && mapRef.current && isOpen) {
      // Inicializar el mapa si no existe
      if (!mapInstanceRef.current) {
        // Coordenadas por defecto (San Luis Potosí, México)
        const defaultLocation = { lat: 22.1565, lng: -100.9855 }

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: defaultLocation,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        markerRef.current = new window.google.maps.Marker({
          position: defaultLocation,
          map: mapInstanceRef.current,
          title: "Ubicación",
          animation: window.google.maps.Animation.DROP,
        })
      }
    }
  }, [mapLoaded, isOpen])

  // Función para buscar la dirección cuando se presiona el botón
  const handleSearchAddress = () => {
    if (!mapLoaded || !mapInstanceRef.current || !formData.address.trim()) {
      setErrors((prev) => ({
        ...prev,
        mapError: !formData.address.trim() ? "Ingresa una dirección para buscar" : "",
      }))
      return
    }

    setIsSearchingAddress(true)
    setErrors((prev) => ({ ...prev, mapError: "" }))

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: formData.address + ", San Luis Potosí, México" }, (results, status) => {
      setIsSearchingAddress(false)

      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location

        // Actualizar el mapa
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(16) // Acercar un poco más

          if (markerRef.current) {
            markerRef.current.setPosition(location)
            markerRef.current.setTitle(formData.storeName || results[0].formatted_address)
          }
        }

        // Generar URL de Google Maps
        const lat = location.lat()
        const lng = location.lng()
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`

        // Actualizar los datos del formulario
        setFormData((prev) => ({
          ...prev,
          lat: lat,
          lng: lng,
          formattedAddress: results[0].formatted_address,
          mapUrl: mapUrl,
        }))
      } else {
        // Manejar error de geocodificación
        console.error("Error al buscar la dirección:", status)
        setErrors((prev) => ({
          ...prev,
          mapError: "No se encontró la dirección. Intenta con otra más específica.",
        }))
      }
    })
  }

  // Manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscapeKey)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target

    if (name === "tieneRefrigerador") {
      setFormData((prev) => ({
        ...prev,
        tieneRefrigerador: checked,
        // Limpiar la capacidad si se desmarca
        capacidadRefrigerador: checked ? prev.capacidadRefrigerador : "",
      }))
    } else if (name.startsWith("dia_")) {
      const dia = name.replace("dia_", "")
      setFormData((prev) => ({
        ...prev,
        diasVisita: {
          ...prev.diasVisita,
          [dia]: checked,
        },
      }))

      // Limpiar error de días de visita
      if (errors.diasVisita) {
        setErrors((prev) => ({ ...prev, diasVisita: "" }))
      }
    }
  }

  const handleSelectRuta = (rutaId: string) => {
    setFormData((prev) => ({
      ...prev,
      ruta: rutaId,
    }))

    // Limpiar error de ruta
    if (errors.ruta) {
      setErrors((prev) => ({ ...prev, ruta: "" }))
    }

    // Cerrar el dropdown
    setRouteDropdownOpen(false)
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { ...initialErrorsState }

    if (!formData.storeName.trim()) {
      newErrors.storeName = "El nombre de la tienda es requerido"
      valid = false
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El número de teléfono es requerido"
      valid = false
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Ingresa un número de teléfono válido (10 dígitos)"
      valid = false
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida"
      valid = false
    }

    // Verificar que se haya buscado la dirección en el mapa
    if (formData.lat === 0 && formData.lng === 0) {
      newErrors.mapError = "Debes buscar la dirección en el mapa"
      valid = false
    }

    // Verificar que tengamos una dirección formateada
    if (!formData.formattedAddress && formData.lat !== 0) {
      newErrors.mapError = "Error al obtener la dirección formateada. Intenta buscar nuevamente."
      valid = false
    }

    if (!formData.ruta) {
      newErrors.ruta = "Selecciona una ruta"
      valid = false
    }

    // Verificar que al menos un día esté seleccionado
    const alMenosUnDia = Object.values(formData.diasVisita).some((value) => value)
    if (!alMenosUnDia) {
      newErrors.diasVisita = "Selecciona al menos un día de visita"
      valid = false
    }

    // Validar capacidad del refrigerador si tiene uno
    if (formData.tieneRefrigerador && !formData.capacidadRefrigerador.trim()) {
      newErrors.capacidadRefrigerador = "Indica la capacidad del refrigerador"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Preparar los datos en el formato que espera la API
      const clienteData = {
        local: formData.storeName,
        telefono: formData.phone,
        direccion: formData.formattedAddress || formData.address, // Usar la dirección formateada de Google Maps
        lat: formData.lat,
        lng: formData.lng,
        tiene_refrigerador: formData.tieneRefrigerador,
        capacidad_refrigerador: formData.tieneRefrigerador ? formData.capacidadRefrigerador : "",
        rutas: [
          {
            rutaId: formData.ruta,
            dias: formData.diasVisita,
          },
        ],
      }

      console.log("Enviando datos del cliente:", clienteData)

      // Realizar la petición POST a la API
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clienteData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar el cliente")
      }

      const result = await response.json()
      console.log("Cliente guardado con éxito:", result)

      // Mostrar notificación de éxito
      showToast("Cliente guardado exitosamente", "success")

      // Éxito - Cerrar el modal (el estado se reiniciará en el useEffect)
      setIsOpen(false)
    } catch (error) {
      console.error("Error al guardar el cliente:", error)
      setErrors((prev) => ({
        ...prev,
        mapError: error instanceof Error ? error.message : "Error al guardar el cliente. Intente nuevamente.",
      }))
      showToast(error instanceof Error ? error.message : "Error al guardar el cliente", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Eliminar todos los caracteres no numéricos
    const numbers = value.replace(/\D/g, "")

    // Aplicar formato: (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formattedValue }))

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
  }

  // Botón para abrir el modal
  const triggerButton = (
    <button
      onClick={() => setIsOpen(true)}
      className="group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
    >
      <UserPlus className="h-5 w-5 group-hover:animate-bounce" />
      Agregar Cliente
    </button>
  )

  // El modal que se renderizará en el portal
  const modalContent =
    isOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              style={{ animation: "fadeIn 150ms ease-out" }}
            ></div>

            {/* Modal Content */}
            <div
              className="relative w-full max-w-3xl mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl p-8 backdrop-blur-sm bg-black/80 text-white"
              style={{ animation: "fadeIn 200ms ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Elementos decorativos */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

              {/* Botón de cierre */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 bg-gray-800/80 text-gray-400 transition-colors hover:text-white hover:bg-gray-700 z-20"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </button>

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Snowflake className="h-6 w-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                      Agregar Nuevo Cliente
                    </h2>
                    <Snowflake className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-gray-300 text-center text-sm">
                    Ingresa los datos del nuevo cliente para agregarlo al sistema
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label htmlFor="storeName" className="text-gray-300 flex items-center gap-2">
                        <Store className="h-4 w-4 text-blue-400" />
                        Nombre de la Tienda
                      </label>
                      <input
                        id="storeName"
                        name="storeName"
                        placeholder="Ej. Abarrotes Don Juan"
                        className="flex h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.storeName}
                        onChange={handleChange}
                      />
                      {errors.storeName && <p className="text-red-400 text-sm">{errors.storeName}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-400" />
                        Número de Teléfono
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        placeholder="(444) 123-4567"
                        className="flex h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        maxLength={14}
                      />
                      {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Dirección y Mapa */}
                  <div className="space-y-2">
                    <label htmlFor="address" className="text-gray-300 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      Dirección
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="address"
                        name="address"
                        placeholder="Ej. Av. Universidad 123, Col. Centro, San Luis Potosí"
                        className="flex h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.address}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={handleSearchAddress}
                        disabled={isSearchingAddress || !formData.address.trim()}
                        className="h-10 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[100px]"
                      >
                        {isSearchingAddress ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Buscando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            <span>Validar</span>
                          </>
                        )}
                      </button>
                    </div>
                    {errors.address && <p className="text-red-400 text-sm">{errors.address}</p>}
                    {!formData.formattedAddress && formData.address && (
                      <p className="text-amber-400 text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Haz clic en "Buscar" para validar la dirección
                      </p>
                    )}

                    {/* Mapa de Google */}
                    <div ref={mapRef} className="w-full h-48 mt-2 rounded-lg overflow-hidden border border-gray-700/50">
                      {!mapLoaded && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900/50">
                          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {errors.mapError && <p className="text-red-400 text-sm">{errors.mapError}</p>}

                    {formData.formattedAddress && (
                      <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                        <p className="text-sm text-blue-200 flex items-center">
                          <Check className="h-4 w-4 text-green-400 mr-2" />
                          <span>Dirección validada:</span>
                        </p>
                        <p className="text-sm text-white mt-1 pl-6">{formData.formattedAddress}</p>
                      </div>
                    )}
                    {formData.mapUrl && (
                      <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                        <span>URL del mapa generada correctamente</span>
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                  </div>

                  {/* Selección de Ruta */}
                  <div className="space-y-2">
                    <label className="text-gray-300 flex items-center gap-2">
                      <Route className="h-4 w-4 text-blue-400" />
                      Ruta Asignada
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onClick={() => setRouteDropdownOpen(!routeDropdownOpen)}
                      >
                        <span>
                          {formData.ruta
                            ? rutas.find((r) => r.id === formData.ruta)?.nombre
                            : isLoadingRutas
                              ? "Cargando rutas..."
                              : "Seleccionar ruta"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>

                      {routeDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700/50 bg-gray-900/90 py-1 shadow-lg backdrop-blur-sm">
                          {isLoadingRutas ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-400 mr-2" />
                              <span className="text-sm text-gray-300">Cargando rutas...</span>
                            </div>
                          ) : rutas.length > 0 ? (
                            rutas.map((ruta) => (
                              <button
                                key={ruta.id}
                                type="button"
                                className="flex w-full items-center px-3 py-2 text-sm text-white hover:bg-blue-600/20"
                                onClick={() => handleSelectRuta(ruta.id)}
                              >
                                {ruta.nombre}
                                {formData.ruta === ruta.id && <Check className="ml-auto h-4 w-4 text-blue-400" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-400">No hay rutas disponibles</div>
                          )}
                        </div>
                      )}
                    </div>

                    {errors.ruta && <p className="text-red-400 text-sm">{errors.ruta}</p>}
                  </div>

                  {/* Días de Visita */}
                  <div className="space-y-2">
                    <label className="text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      Días de Visita
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DIAS_SEMANA.map((dia) => (
                        <label key={dia.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name={`dia_${dia.id}`}
                            checked={formData.diasVisita[dia.id as keyof typeof formData.diasVisita]}
                            onChange={handleCheckboxChange}
                            className="rounded border-gray-700 bg-gray-900/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-300">{dia.label}</span>
                        </label>
                      ))}
                    </div>

                    {errors.diasVisita && <p className="text-red-400 text-sm">{errors.diasVisita}</p>}
                  </div>

                  {/* Refrigerador */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="tieneRefrigerador"
                          checked={formData.tieneRefrigerador}
                          onChange={handleCheckboxChange}
                          className="rounded border-gray-700 bg-gray-900/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-gray-300 flex items-center gap-2">
                          <Refrigerator className="h-4 w-4 text-blue-400" />
                          Tiene Refrigerador
                        </span>
                      </label>
                    </div>

                    {formData.tieneRefrigerador && (
                      <div className="pl-6 space-y-2">
                        <label htmlFor="capacidadRefrigerador" className="text-sm text-gray-300">
                          Capacidad del Refrigerador
                        </label>
                        <input
                          id="capacidadRefrigerador"
                          name="capacidadRefrigerador"
                          placeholder="Ej. 200 litros"
                          className="flex h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.capacidadRefrigerador}
                          onChange={handleChange}
                        />
                        {errors.capacidadRefrigerador && (
                          <p className="text-red-400 text-sm">{errors.capacidadRefrigerador}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 group bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/20 border border-gray-600/30"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5" />
                          Guardar Cliente
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {triggerButton}
      {modalContent}
      <ToastContainer />

      {/* Estilos para animaciones y corrección de scroll horizontal */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Estilos para los checkboxes */
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(107, 114, 128, 0.5);
          appearance: none;
          background-color: rgba(17, 24, 39, 0.5);
          cursor: pointer;
          position: relative;
        }
        
        input[type="checkbox"]:checked {
          background-color: rgb(59, 130, 246);
          border-color: rgb(59, 130, 246);
        }
        
        input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        input[type="checkbox"]:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 1px;
        }
        
        /* Prevenir scroll horizontal en el modal */
        .overflow-y-auto {
          overflow-x: hidden;
        }
      `}</style>
    </>
  )
}
