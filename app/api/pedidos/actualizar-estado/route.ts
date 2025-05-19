import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId, estado, motivo, productos } = body

    if (!clienteId || !rutaId || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el estado sea válido
    if (estado !== "completado" && estado !== "cancelado") {
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

    // Verificar si existe un pedido para este cliente en esta asignación
    const pedidosExistentes = await query(
      `
      SELECT id FROM pedidos 
      WHERE asignacion_id = ? AND cliente_id = ?
      LIMIT 1
      `,
      [asignacionId, clienteId],
    )

    let pedidoId

    if (pedidosExistentes && pedidosExistentes.length > 0) {
      pedidoId = pedidosExistentes[0].id

      // Actualizar el pedido existente
      if (estado === "completado" && productos) {
        // Actualizar cantidades de productos entregados
        await query(
          `
          UPDATE pedidos 
          SET 
            estado = ?,
            gourmet15 = ?,
            gourmet5 = ?,
            barraHielo = ?,
            mediaBarra = ?,
            premium = ?
          WHERE id = ?
          `,
          [
            estado,
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            pedidoId,
          ],
        )

        // Actualizar el inventario (restar de sobrantes)
        await query(
          `
          UPDATE sobrantes
          SET
            gourmet15 = GREATEST(0, gourmet15 - ?),
            gourmet5 = GREATEST(0, gourmet5 - ?),
            barraHielo = GREATEST(0, barraHielo - ?),
            mediaBarra = GREATEST(0, mediaBarra - ?),
            premium = GREATEST(0, premium - ?)
          WHERE rutero_id = (
            SELECT rutero_id FROM asignaciones WHERE id = ?
          )
          AND ruta_id = ?
          AND fecha = CURDATE()
          `,
          [
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            asignacionId,
            rutaId,
          ],
        )
      } else if (estado === "cancelado" && motivo) {
        // Actualizar estado y motivo de cancelación
        await query(
          `
          UPDATE pedidos 
          SET 
            estado = ?,
            motivo_cancelacion = ?
          WHERE id = ?
          `,
          [estado, motivo, pedidoId],
        )
      }
    } else {
      // Crear un nuevo pedido
      if (estado === "completado" && productos) {
        const result = await query(
          `
          INSERT INTO pedidos (
            asignacion_id, cliente_id, estado,
            gourmet15, gourmet5, barraHielo, mediaBarra, premium
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            asignacionId,
            clienteId,
            estado,
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
          ],
        )
        pedidoId = result.insertId

        // Actualizar el inventario (restar de sobrantes)
        await query(
          `
          UPDATE sobrantes
          SET
            gourmet15 = GREATEST(0, gourmet15 - ?),
            gourmet5 = GREATEST(0, gourmet5 - ?),
            barraHielo = GREATEST(0, barraHielo - ?),
            mediaBarra = GREATEST(0, mediaBarra - ?),
            premium = GREATEST(0, premium - ?)
          WHERE rutero_id = (
            SELECT rutero_id FROM asignaciones WHERE id = ?
          )
          AND ruta_id = ?
          AND fecha = CURDATE()
          `,
          [
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            asignacionId,
            rutaId,
          ],
        )
      } else if (estado === "cancelado" && motivo) {
        const result = await query(
          `
          INSERT INTO pedidos (
            asignacion_id, cliente_id, estado, motivo_cancelacion
          ) VALUES (?, ?, ?, ?)
          `,
          [asignacionId, clienteId, estado, motivo],
        )
        pedidoId = result.insertId
      }
    }

    return NextResponse.json({
      success: true,
      message: estado === "completado" ? "Pedido completado correctamente" : "Pedido cancelado correctamente",
      pedidoId,
    })
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error)
    return NextResponse.json({ error: "Error al actualizar estado del pedido" }, { status: 500 })
  }
}
