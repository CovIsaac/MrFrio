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
  