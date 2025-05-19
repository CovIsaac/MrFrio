import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    // Obtener todos los productos con sus precios base
    const productos = await query("SELECT id, nombre, precio_base FROM productos WHERE activo = 1 ORDER BY nombre ASC")

    return NextResponse.json(productos, { status: 200 })
  } catch (error) {
    console.error("Error al obtener precios base:", error)
    return NextResponse.json({ error: "Error al obtener precios base" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { productoId, precioBase } = await request.json()

    // Validar datos
    if (!productoId || precioBase === undefined) {
      return NextResponse.json({ error: "Se requiere ID de producto y precio base" }, { status: 400 })
    }

    // Actualizar el precio base del producto
    await query("UPDATE productos SET precio_base = ? WHERE id = ?", [precioBase, productoId])

    return NextResponse.json({ success: true, message: "Precio base actualizado correctamente" }, { status: 200 })
  } catch (error) {
    console.error("Error al actualizar precio base:", error)
    return NextResponse.json({ error: "Error al actualizar precio base" }, { status: 500 })
  }
}
