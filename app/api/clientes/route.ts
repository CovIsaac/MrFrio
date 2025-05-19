import { NextResponse } from "next/server"
import { crearCliente } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Datos recibidos en API:", body)

    // Validar datos requeridos
    if (!body.local || !body.direccion || !body.rutas || body.rutas.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos requeridos. Se necesita local, dirección y al menos una ruta." },
        { status: 400 },
      )
    }

    // Crear el cliente en la base de datos
    const resultado = await crearCliente(body)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al crear cliente:", error)
    return NextResponse.json(
      {
        error: "Error al crear cliente",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
