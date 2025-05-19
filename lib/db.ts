import { createPool } from "mysql2/promise"

const pool = createPool({
  host: process.env.DB_HOST || "srv440.hstgr.io",
    user: process.env.DB_USER || "u191251575_mrfrio",
    password: process.env.DB_PASSWORD || "Mrfrioreact123",
    database: process.env.DB_NAME || "u191251575_reactfrio",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})

// Reemplazar la función query con una versión sin logs de depuración
export async function query(sql: string, params?: any[]) {
  try {
    const [rows] = await pool.execute(sql, params)
    return rows
  } catch (error) {
    console.error("Error en consulta SQL:", error)
    throw error
  }
}

export async function getRuteros() {
  const rows = await query("SELECT * FROM ruteros WHERE activo = 1")
  return rows
}

export async function getProductos() {
  const rows = await query("SELECT * FROM productos WHERE activo = 1")
  return rows
}

export async function getRutas() {
  const rows = await query("SELECT id, nombre FROM rutas WHERE activo = 1")
  return rows
}

// Función para obtener el nombre de la columna del día actual en la base de datos
export function getDiaActualColumna() {
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0 = domingo, 1 = lunes, etc.
  return `dia_${diasSemana[diaSemana]}`
}

// Función para obtener el nombre del día actual en español
export function getDiaActualNombre() {
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  return diasSemana[diaSemana]
}

// Modificar la función getClientesPorRuta para limpiar los nombres antes de devolverlos
export async function getClientesPorRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()

  // Consulta para obtener clientes regulares y extemporáneos para esta ruta
  const rows = await query(
    `
    -- Clientes regulares asignados a esta ruta para hoy
    SELECT 
      c.*,
      0 as es_extemporaneo
    FROM clientes c
    JOIN clientes_rutas cr ON c.id = cr.cliente_id
    WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1
    
    UNION
    
    -- Clientes extemporáneos para esta ruta hoy
    SELECT 
      c.*,
      1 as es_extemporaneo
    FROM clientes c
    JOIN clientes_extemporaneos ce ON c.id = ce.cliente_id
    WHERE ce.ruta_id = ? 
      AND ce.fecha = CURDATE() 
      AND c.activo = 1
    
    ORDER BY isExtra ASC, es_extemporaneo ASC, local ASC
    `,
    [rutaId, rutaId],
  )

  // Limpiar los nombres de los clientes antes de devolverlos
  const clientesLimpios = rows.map((cliente: any) => {
    // Crear una copia del cliente para no modificar el original
    const clienteLimpio = { ...cliente }

    // Limpiar el nombre del cliente (eliminar números al final)
    if (clienteLimpio.local) {
      clienteLimpio.local = clienteLimpio.local.replace(/\s*\d+$/, "")
    }

    return clienteLimpio
  })

  return clientesLimpios
}

// También modificar la función getClienteCountPorRuta para contar correctamente
export async function getClienteCountPorRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()

  const [result]: any = await query(
    `
    SELECT COUNT(*) as count
    FROM (
      -- Clientes regulares para esta ruta hoy
      SELECT c.id
      FROM clientes c
      JOIN clientes_rutas cr ON c.id = cr.cliente_id
      WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1
      
      UNION
      
      -- Clientes extemporáneos para esta ruta hoy
      SELECT c.id
      FROM clientes c
      JOIN clientes_extemporaneos ce ON c.id = ce.cliente_id
      WHERE ce.ruta_id = ? 
        AND ce.fecha = CURDATE() 
        AND c.activo = 1
    ) AS clientes_combinados
  `,
    [rutaId, rutaId],
  )
  return result.count
}

// Reemplazar la función getHistorialSobrantes con una versión sin logs de depuración
export async function getHistorialSobrantes(ruteroId: string) {
  try {
    const rows = await query(
      `
      SELECT ruta_id as ruta, DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, 
             gourmet15, gourmet5, barraHielo, mediaBarra, premium
      FROM sobrantes
      WHERE rutero_id = ?
      ORDER BY fecha DESC
    `,
      [ruteroId],
    )

    // Transformar los resultados al formato esperado
    return rows.map((row: any) => ({
      fecha: row.fecha,
      ruta: row.ruta,
      productos: {
        gourmet15: row.gourmet15,
        gourmet5: row.gourmet5,
        barraHielo: row.barraHielo,
        mediaBarra: row.mediaBarra,
        premium: row.premium,
      },
    }))
  } catch (error) {
    console.error("Error en getHistorialSobrantes:", error)
    throw error
  }
}

// Función para calcular los totales de productos de una lista de pedidos
function calcularTotalesPedidos(pedidos: any[]) {
  const totales = {
    gourmet15: 0,
    gourmet5: 0,
    barraHielo: 0,
    mediaBarra: 0,
    premium: 0,
  }

  pedidos.forEach((pedido) => {
    totales.gourmet15 += pedido.productos.gourmet15 || 0
    totales.gourmet5 += pedido.productos.gourmet5 || 0
    totales.barraHielo += pedido.productos.barraHielo || 0
    totales.mediaBarra += pedido.productos.mediaBarra || 0
    totales.premium += pedido.productos.premium || 0
  })

  return totales
}

// Modificar la función guardarAsignacionRuta para guardar solo los totales
export async function guardarAsignacionRuta(rutaId: string, ruteroId: string, pedidos: any[]) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Crear asignación
    const [asignacionResult]: any = await connection.execute(
      "INSERT INTO asignaciones (ruta_id, rutero_id, fecha) VALUES (?, ?, NOW())",
      [rutaId, ruteroId],
    )
    const asignacionId = asignacionResult.insertId

    // Calcular totales de productos para el inventario inicial
    const totales = calcularTotalesPedidos(pedidos)

    // Registrar el inventario inicial en la tabla de sobrantes
    await connection.execute(
      `INSERT INTO sobrantes (rutero_id, ruta_id, fecha, gourmet15, gourmet5, barraHielo, mediaBarra, premium)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
      [ruteroId, rutaId, totales.gourmet15, totales.gourmet5, totales.barraHielo, totales.mediaBarra, totales.premium],
    )

    await connection.commit()
    return { success: true, asignacionId }
  } catch (error) {
    await connection.rollback()
    console.error("Error al guardar asignación:", error)
    throw error
  } finally {
    connection.release()
  }
}

export async function registrarSobrantes(ruteroId: string, rutaId: string, productos: any) {
  try {
    await query(
      `INSERT INTO sobrantes (rutero_id, ruta_id, fecha, gourmet15, gourmet5, barraHielo, mediaBarra, premium)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
      [
        ruteroId,
        rutaId,
        productos.gourmet15 || 0,
        productos.gourmet5 || 0,
        productos.barraHielo || 0,
        productos.mediaBarra || 0,
        productos.premium || 0,
      ],
    )
    return { success: true }
  } catch (error) {
    console.error("Error al registrar sobrantes:", error)
    throw error
  }
}

// Función para crear un nuevo cliente
export async function crearCliente(cliente: {
  local: string
  telefono: string
  direccion: string
  lat?: number
  lng?: number
  tiene_refrigerador: boolean
  capacidad_refrigerador?: string
  rutas: Array<{
    rutaId: string
    dias: {
      lunes: boolean
      martes: boolean
      miercoles: boolean
      jueves: boolean
      viernes: boolean
      sabado: boolean
      domingo: boolean
    }
  }>
}) {
  // Iniciar transacción
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Generar un ID único para el cliente
    const clienteId = `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    console.log("Creando cliente con ID:", clienteId)

    // Insertar el cliente
    await connection.execute(
      `INSERT INTO clientes 
       (id, local, telefono, direccion, lat, lng, tiene_refrigerador, capacidad_refrigerador) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        cliente.local,
        cliente.telefono || null,
        cliente.direccion,
        cliente.lat || null,
        cliente.lng || null,
        cliente.tiene_refrigerador ? 1 : 0, // Convertir booleano a 1/0 para MySQL
        cliente.capacidad_refrigerador || null,
      ],
    )

    console.log("Cliente insertado, asignando a rutas...")

    // Asignar el cliente a las rutas seleccionadas
    for (const ruta of cliente.rutas) {
      await connection.execute(
        `INSERT INTO clientes_rutas 
         (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes, dia_sabado, dia_domingo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clienteId,
          ruta.rutaId,
          ruta.dias.lunes ? 1 : 0,
          ruta.dias.martes ? 1 : 0,
          ruta.dias.miercoles ? 1 : 0,
          ruta.dias.jueves ? 1 : 0,
          ruta.dias.viernes ? 1 : 0,
          ruta.dias.sabado ? 1 : 0,
          ruta.dias.domingo ? 1 : 0,
        ],
      )
    }

    console.log("Rutas asignadas, confirmando transacción...")

    await connection.commit()
    return { success: true, clienteId }
  } catch (error) {
    await connection.rollback()
    console.error("Error al crear cliente:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Añadir estas nuevas funciones al archivo lib/db.ts existente

// Función para buscar clientes por término (nombre, dirección o ID)
export async function buscarClientes(termino: string, excluirDia?: string) {
  // Construir la consulta base
  let sql = `
    SELECT c.id, c.local, c.direccion, c.lat, c.lng, c.isExtra
    FROM clientes c
    WHERE c.activo = 1 AND (
      c.local LIKE ? OR 
      c.direccion LIKE ? OR 
      c.id LIKE ?
    )
    AND c.id NOT IN (
      -- Excluir clientes que ya están asignados extemporáneamente hoy
      SELECT ce.cliente_id
      FROM clientes_extemporaneos ce
      WHERE ce.fecha = CURDATE()
    )
  `

  const params = [`%${termino}%`, `%${termino}%`, `%${termino}%`]

  // Si se especifica un día para excluir, añadir la condición
  if (excluirDia) {
    sql += `
      AND c.id NOT IN (
        SELECT cr.cliente_id
        FROM clientes_rutas cr
        WHERE cr.${excluirDia} = 1
      )
    `
  }

  sql += " ORDER BY c.local ASC LIMIT 20"

  const rows = await query(sql, params)
  return rows
}

// Función para obtener todos los clientes que NO están asignados a un día específico
export async function getClientesNoDia(excluirDia: string) {
  const sql = `
    SELECT c.id, c.local, c.direccion, c.lat, c.lng, c.isExtra
    FROM clientes c
    WHERE c.activo = 1
    AND c.id NOT IN (
      SELECT cr.cliente_id
      FROM clientes_rutas cr
      WHERE cr.${excluirDia} = 1
    )
    AND c.id NOT IN (
      -- Excluir clientes que ya están asignados extemporáneamente hoy
      SELECT ce.cliente_id
      FROM clientes_extemporaneos ce
      WHERE ce.fecha = CURDATE()
    )
    ORDER BY c.local ASC
  `

  const rows = await query(sql)
  return rows
}

// Función para obtener el primer cliente de una ruta (para calcular distancias)
export async function getPrimerClienteRuta(rutaId: string) {
  const diaActual = getDiaActualColumna()

  const [primerCliente]: any = await query(
    `
    SELECT c.id, c.lat, c.lng
    FROM clientes c
    INNER JOIN clientes_rutas cr ON c.id = cr.cliente_id
    WHERE cr.ruta_id = ? AND c.activo = 1 AND cr.${diaActual} = 1 AND c.isExtra = 0
    ORDER BY c.local ASC
    LIMIT 1
    `,
    [rutaId],
  )

  return primerCliente || null
}

// Función para crear un pedido extemporáneo
export async function crearPedidoExtemporaneo(clienteId: string, rutaId: string, esExtemporaneo = true) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Obtener el día actual
    const diaActual = getDiaActualColumna()

    // Buscar todas las rutas del cliente
    const clienteRutas: any = await connection.execute(
      `SELECT ruta_id, ${diaActual} as dia_actual
       FROM clientes_rutas 
       WHERE cliente_id = ?`,
      [clienteId],
    )

    // Guardar todas las rutas originales del cliente
    let rutasOriginales = []
    if (clienteRutas && clienteRutas[0]) {
      rutasOriginales = clienteRutas[0].map((ruta: any) => ({
        rutaId: ruta.ruta_id,
        diaActual: ruta.dia_actual === 1,
      }))
    }

    // Convertir a JSON para almacenar en la base de datos
    const rutasOriginalesJSON = JSON.stringify(rutasOriginales)

    // 1. Verificar si ya existe una asignación para esta ruta hoy
    const [asignacionExistente]: any = await connection.execute(
      `
      SELECT id, rutero_id FROM asignaciones 
      WHERE ruta_id = ? AND DATE(fecha) = CURDATE()
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId

    if (asignacionExistente && asignacionExistente.length > 0 && asignacionExistente[0].id) {
      // Usar la asignación existente
      asignacionId = asignacionExistente[0].id
    } else {
      // Crear una nueva asignación con un rutero existente
      // Primero, obtener un rutero disponible (el primero activo)
      const [ruteros]: any = await connection.execute("SELECT id FROM ruteros WHERE activo = 1 LIMIT 1")

      if (!ruteros || ruteros.length === 0) {
        throw new Error(
          "No hay ruteros disponibles para asignar. Debe existir al menos un rutero activo en el sistema.",
        )
      }

      const ruteroId = ruteros[0].id

      // Crear la asignación con el rutero encontrado
      const [asignacionResult]: any = await connection.execute(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'pendiente')",
        [rutaId, ruteroId],
      )

      asignacionId = asignacionResult.insertId
    }

    // 2. Verificar si ya existe un pedido para este cliente en esta asignación
    const [pedidoExistente]: any = await connection.execute(
      "SELECT id FROM pedidos WHERE asignacion_id = ? AND cliente_id = ?",
      [asignacionId, clienteId],
    )

    if (pedidoExistente && pedidoExistente.length > 0 && pedidoExistente[0].id) {
      // Ya existe un pedido para este cliente en esta asignación
      await connection.commit()
      return {
        success: true,
        message: "El cliente ya tiene un pedido asignado para hoy",
        pedidoId: pedidoExistente[0].id,
      }
    }

    // 3. Crear el pedido con la información de rutas originales
    const [pedidoResult]: any = await connection.execute(
      `INSERT INTO pedidos (
        asignacion_id, cliente_id, 
        gourmet15, gourmet5, barraHielo, mediaBarra, premium, 
        es_extemporaneo, rutas_originales
      ) VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)`,
      [asignacionId, clienteId, esExtemporaneo ? 1 : 0, rutasOriginalesJSON],
    )

    await connection.commit()
    return {
      success: true,
      message: "Pedido extemporáneo creado correctamente solo para hoy",
      pedidoId: pedidoResult.insertId,
    }
  } catch (error) {
    await connection.rollback()
    console.error("Error al crear pedido extemporáneo:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Nueva función para asignar un cliente extemporáneo a una ruta
export async function asignarClienteExtemporaneo(clienteId: string, rutaId: string) {
  try {
    // Insertar o actualizar la asignación extemporánea
    await query(
      `
      INSERT INTO clientes_extemporaneos (cliente_id, ruta_id, fecha)
      VALUES (?, ?, CURDATE())
      ON DUPLICATE KEY UPDATE ruta_id = ?
      `,
      [clienteId, rutaId, rutaId],
    )

    return {
      success: true,
      message: "Cliente asignado extemporáneamente a la ruta solo para hoy",
    }
  } catch (error) {
    console.error("Error al asignar cliente extemporáneo:", error)
    throw error
  }
}

// Función para limpiar clientes extemporáneos de días anteriores
export async function limpiarClientesExtemporaneos() {
  try {
    const result = await query(
      `
      DELETE FROM clientes_extemporaneos
      WHERE fecha < CURDATE()
      `,
    )

    return {
      success: true,
      affectedRows: result.affectedRows || 0,
    }
  } catch (error) {
    console.error("Error al limpiar clientes extemporáneos:", error)
    throw error
  }
}
