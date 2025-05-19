import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener el cliente activo para una ruta
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el cliente activo para la ruta y fecha actual
    const clientesActivos = await query(
      `
      SELECT 
        cliente_id
      FROM seguimiento_clientes
      WHERE ruta_id = ? 
        AND fecha = CURDATE()
        AND estado = 'activo'
      LIMIT 1
      `,
      [rutaId],
    )

    if (!clientesActivos || clientesActivos.length === 0) {
      return NextResponse.json({ clienteActivo: null })
    }

    return NextResponse.json({ clienteActivo: clientesActivos[0].cliente_id })
  } catch (error) {
    console.error("Error al obtener cliente activo:", error)
    return NextResponse.json({ error: "Error al obtener cliente activo" }, { status: 500 })
  }
}

// POST: Establecer un cliente como activo
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId } = body

    if (!clienteId || !rutaId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Primero, establecer todos los clientes de esta ruta como pendientes
    await query(
      `
      UPDATE seguimiento_clientes
      SET estado = 'pendiente'
      WHERE ruta_id = ? 
        AND fecha = CURDATE()
        AND estado = 'activo'
      `,
      [rutaId],
    )

    // Luego, establecer el cliente seleccionado como activo
    await query(
      `
      INSERT INTO seguimiento_clientes (cliente_id, ruta_id, fecha, estado)
      VALUES (?, ?, CURDATE(), 'activo')
      ON DUPLICATE KEY UPDATE estado = 'activo'
      `,
      [clienteId, rutaId],
    )

    return NextResponse.json({
      success: true,
      message: "Cliente establecido como activo correctamente",
    })
  } catch (error) {
    console.error("Error al establecer cliente activo:", error)
    return NextResponse.json({ error: "Error al establecer cliente activo" }, { status: 500 })
  }
}
