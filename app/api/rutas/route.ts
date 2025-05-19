import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Simulamos un retraso para probar la UI
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // En producción, descomentar la siguiente línea:
    // const rutas = await getRutas()

    // Por ahora, usamos datos de ejemplo
    const rutas = [
      { id: "101", nombre: "Ruta 101" },
      { id: "102", nombre: "Ruta 102" },
      { id: "103", nombre: "Ruta 103" },
      { id: "104", nombre: "Ruta 104" },
      { id: "105", nombre: "Ruta 105" },
      { id: "106", nombre: "Ruta 106" },
      { id: "107", nombre: "Ruta 107" },
      { id: "LOCAL", nombre: "Ruta LOCAL" },
    ]

    return NextResponse.json(rutas)
  } catch (error) {
    console.error("Error al obtener rutas:", error)
    return NextResponse.json({ error: "Error al obtener rutas" }, { status: 500 })
  }
}
