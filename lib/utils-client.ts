// Función para obtener el nombre del día actual en español (cliente)
export function getDiaActualNombre() {
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  return diasSemana[diaSemana]
}

// Función para obtener el nombre de la columna del día actual (cliente)
export function getDiaActualColumna() {
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0 = domingo, 1 = lunes, etc.
  return `dia_${diasSemana[diaSemana]}`
}

// Función para formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount)
}

// Función para formatear fechas
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
