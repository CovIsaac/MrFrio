import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener los precios personalizados de un cliente
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")

    if (!clienteId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'clienteId'" }, { status: 400 })
    }

    // Obtener los datos del cliente con sus precios personalizados
    const clienteResult = await query(
      `
      SELECT 
        id,
        precio_gourmet15, 
        precio_gourmet5, 
        precio_barraHielo, 
        precio_mediaBarra, 
        precio_premium
      FROM clientes
      WHERE id = ?
    `,
      [clienteId],
    )

    if (!clienteResult || !Array.isArray(clienteResult) || clienteResult.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const cliente = clienteResult[0] as any

    // Obtener los precios base de todos los productos
    const productosResult = await query(
      `
      SELECT id, nombre, precio_base
      FROM productos
      WHERE activo = 1
    `,
    )

    if (!productosResult || !Array.isArray(productosResult)) {
      return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
    }

    const productos = productosResult as any[]

    // Mapeo de IDs de productos a nombres de columna en la tabla clientes
    const columnasProductos: Record<string, string> = {
      gourmet15: "precio_gourmet15",
      gourmet5: "precio_gourmet5",
      barraHielo: "precio_barraHielo",
      mediaBarra: "precio_mediaBarra",
      premium: "precio_premium",
    }

    // Crear un objeto con todos los precios (base y personalizados)
    const precios: Record<string, { base: number; personalizado: number | null }> = {}

    // Primero, establecer todos los precios base
    productos.forEach((producto) => {
      precios[producto.id] = {
        base: Number.parseFloat(producto.precio_base) || 0,
        personalizado: null,
      }
    })

    // Luego, añadir los precios personalizados donde existan
    Object.entries(columnasProductos).forEach(([productoId, columna]) => {
      if (cliente[columna] !== null && cliente[columna] !== undefined) {
        if (precios[productoId]) {
          precios[productoId].personalizado = Number.parseFloat(cliente[columna])
        } else {
          precios[productoId] = {
            base: 0, // Si por alguna razón no tenemos el precio base
            personalizado: Number.parseFloat(cliente[columna]),
          }
        }
      }
    })

    return NextResponse.json({
      clienteId: cliente.id,
      precios,
    })
  } catch (error) {
    console.error("Error al obtener precios personalizados:", error)
    return NextResponse.json({ error: "Error al obtener precios personalizados" }, { status: 500 })
  }
}

// POST: Guardar un precio personalizado para un cliente y producto
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, productoId, precio } = body

    if (!clienteId || !productoId || precio === undefined) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el precio sea un número positivo
    const precioValue = Number.parseFloat(precio)
    if (isNaN(precioValue) || precioValue < 0) {
      return NextResponse.json({ error: "El precio debe ser un número positivo" }, { status: 400 })
    }

    // Mapeo de IDs de productos a nombres de columna en la tabla clientes
    const columnasProductos: Record<string, string> = {
      gourmet15: "precio_gourmet15",
      gourmet5: "precio_gourmet5",
      barraHielo: "precio_barraHielo",
      mediaBarra: "precio_mediaBarra",
      premium: "precio_premium",
    }

    const columnaProducto = columnasProductos[productoId]
    if (!columnaProducto) {
      return NextResponse.json({ error: "Producto no válido" }, { status: 400 })
    }

    // Actualizar el precio personalizado del cliente
    await query(
      `
      UPDATE clientes
      SET ${columnaProducto} = ?
      WHERE id = ?
    `,
      [precioValue, clienteId],
    )

    return NextResponse.json({
      success: true,
      message: "Precio personalizado guardado correctamente",
    })
  } catch (error) {
    console.error("Error al guardar precio personalizado:", error)
    return NextResponse.json({ error: "Error al guardar precio personalizado" }, { status: 500 })
  }
}

// DELETE: Eliminar un precio personalizado para un cliente y producto
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get("clienteId")
    const productoId = searchParams.get("productoId")

    if (!clienteId || !productoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    // Mapeo de IDs de productos a nombres de columna en la tabla clientes
    const columnasProductos: Record<string, string> = {
      gourmet15: "precio_gourmet15",
      gourmet5: "precio_gourmet5",
      barraHielo: "precio_barraHielo",
      mediaBarra: "precio_mediaBarra",
      premium: "precio_premium",
    }

    const columnaProducto = columnasProductos[productoId]
    if (!columnaProducto) {
      return NextResponse.json({ error: "Producto no válido" }, { status: 400 })
    }

    // Establecer el precio personalizado a NULL para eliminarlo
    await query(
      `
      UPDATE clientes
      SET ${columnaProducto} = NULL
      WHERE id = ?
    `,
      [clienteId],
    )

    return NextResponse.json({
      success: true,
      message: "Precio personalizado eliminado correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar precio personalizado:", error)
    return NextResponse.json({ error: "Error al eliminar precio personalizado" }, { status: 500 })
  }
}
