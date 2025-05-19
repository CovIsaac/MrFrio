import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener el estado de seguimiento de los pedidos para una ruta
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el estado de seguimiento de los pedidos para la ruta y fecha actual
    const pedidos = await query(
      `
      SELECT 
        p.cliente_id,
        p.estado_seguimiento
      FROM pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      WHERE a.ruta_id = ? AND DATE(a.fecha) = CURDATE()
      `,
      [rutaId],
    )

    // Convertir a un objeto con cliente_id como clave para facilitar el acceso
    const estadoSeguimiento = pedidos.reduce((acc: any, pedido: any) => {
      acc[pedido.cliente_id] = pedido.estado_seguimiento || "pendiente"
      return acc
    }, {})

    return NextResponse.json(estadoSeguimiento)
  } catch (error) {
    console.error("Error al obtener estado de seguimiento de pedidos:", error)
    return NextResponse.json({ error: "Error al obtener estado de seguimiento de pedidos" }, { status: 500 })
  }
}

// POST: Actualizar el estado de seguimiento de un pedido
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId, estado } = body

    if (!clienteId || !rutaId || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el estado sea válido
    if (!["pendiente", "activo", "completado", "cancelado"].includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Obtener la asignación para la ruta y fecha actual
    const asignaciones = await query(
      `
      SELECT id FROM asignaciones 
      WHERE ruta_id = ? AND DATE(fecha) = CURDATE()
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId

    if (!asignaciones || asignaciones.length === 0) {
      // No hay asignación para esta ruta hoy, crear una nueva
      const ruteros = await query("SELECT id FROM ruteros WHERE activo = 1 LIMIT 1")

      if (!ruteros || ruteros.length === 0) {
        return NextResponse.json({ error: "No hay ruteros disponibles" }, { status: 400 })
      }

      const ruteroId = ruteros[0].id

      const result = await query(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'en_progreso')",
        [rutaId, ruteroId],
      )

      asignacionId = result.insertId
    } else {
      asignacionId = asignaciones[0].id
    }

    // Si estamos marcando un cliente como activo, debemos asegurarnos de que no haya otros activos
    if (estado === "activo") {
      await query(
        `
        UPDATE pedidos p
        JOIN asignaciones a ON p.asignacion_id = a.id
        SET p.estado_seguimiento = 'pendiente'
        WHERE a.ruta_id = ? 
          AND DATE(a.fecha) = CURDATE()
          AND p.cliente_id != ?
          AND p.estado_seguimiento = 'activo'
        `,
        [rutaId, clienteId],
      )
    }

    // Verificar si existe un pedido para este cliente en esta asignación
    const pedidosExistentes = await query(
      `
      SELECT id FROM pedidos 
      WHERE asignacion_id = ? AND cliente_id = ?
      LIMIT 1
      `,
      [asignacionId, clienteId],
    )

    if (pedidosExistentes && pedidosExistentes.length > 0) {
      // Actualizar el pedido existente
      const pedidoId = pedidosExistentes[0].id
      await query(
        `
        UPDATE pedidos 
        SET estado_seguimiento = ?
        WHERE id = ?
        `,
        [estado, pedidoId],
      )
    } else {
      // Crear un nuevo pedido
      await query(
        `
        INSERT INTO pedidos (
          asignacion_id, cliente_id, estado_seguimiento
        ) VALUES (?, ?, ?)
        `,
        [asignacionId, clienteId, estado],
      )
    }

    return NextResponse.json({
      success: true,
      message: `Estado de seguimiento actualizado a '${estado}' correctamente`,
    })
  } catch (error) {
    console.error("Error al actualizar estado de seguimiento:", error)
    return NextResponse.json({ error: "Error al actualizar estado de seguimiento" }, { status: 500 })
  }
}
