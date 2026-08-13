import { saveState } from "../services/store";

/* ============================================================
   IMPORTAR DESDE ODOO — escritura real
   ------------------------------------------------------------
   - Empareja cada pedido/factura con el proveedor/cliente por RIF
     (o por nombre, en la importación manual sin RIF). Si no
     existe, lo crea automáticamente.
   - Evita duplicados: por API usa el ID interno de Odoo; en la
     importación manual usa el NÚMERO de pedido/factura.
   - Marca cada registro con origenOdoo:true, y si se convirtió de
     Bs a USD, guarda la trazabilidad (monto y moneda originales,
     tasa usada) para poder auditar el hábito de capturar en la
     moneda equivocada.
   ============================================================ */

/** Busca (o crea) el proveedor/cliente por RIF. Devuelve { id, proveedores } actualizada. */
function emparejarOCrearContacto(proveedores, rif, nombre, tipo) {
  const rifNorm = (rif || "").trim().toUpperCase();
  let existente = rifNorm ? proveedores.find((p) => (p.rif || "").trim().toUpperCase() === rifNorm) : null;

  if (existente) {
    if (!existente[tipo]) {
      existente = { ...existente, [tipo]: true };
      proveedores = proveedores.map((p) => (p.id === existente.id ? existente : p));
    }
    return { id: existente.id, proveedores };
  }

  const nuevo = {
    id: crypto.randomUUID(),
    rif: rif || "",
    razonSocial: nombre || rif || "Contacto de Odoo",
    esProveedor: tipo === "esProveedor",
    esCliente: tipo === "esCliente",
    bancos: [],
    origenOdoo: true
  };
  return { id: nuevo.id, proveedores: [...proveedores, nuevo] };
}

/** Igual, pero para la importación manual: busca por RIF; si no hay RIF o no coincide, intenta por nombre. */
function emparejarPorRifONombre(proveedores, rif, nombre, tipo) {
  const rifNorm = (rif || "").trim().toUpperCase();
  const nombreNorm = (nombre || "").trim().toLowerCase();

  let existente = rifNorm ? proveedores.find((p) => (p.rif || "").trim().toUpperCase() === rifNorm) : null;
  if (!existente && nombreNorm) {
    existente = proveedores.find((p) => (p.razonSocial || "").trim().toLowerCase() === nombreNorm);
  }
  if (existente) {
    if (!existente[tipo]) {
      existente = { ...existente, [tipo]: true };
      proveedores = proveedores.map((p) => (p.id === existente.id ? existente : p));
    }
    return { id: existente.id, proveedores };
  }

  const nuevo = {
    id: crypto.randomUUID(),
    rif: rif || "",
    razonSocial: nombre || rif || "Contacto de Odoo",
    esProveedor: tipo === "esProveedor",
    esCliente: tipo === "esCliente",
    bancos: [],
    origenOdoo: true
  };
  return { id: nuevo.id, proveedores: [...proveedores, nuevo] };
}

export function crearAccionesOdoo(setSt, userId) {
  return {
    /**
     * Importa pedidos de compra desde un archivo exportado a mano de Odoo
     * (sin API). Cada fila viene de utils/importarOdooManual.js, ya con
     * monedaElegida/montoUSD/tasaUsada/sinTasa resueltos por el usuario.
     * Anti-duplicados por NÚMERO de pedido (no hay ID interno de Odoo aquí).
     */
    importarPedidosOdooManual: (filasNormalizadas) => {
      let creados = 0, omitidos = 0, sinTasa = 0;
      setSt((prev) => {
        let proveedores = [...(prev.proveedores || [])];
        const existentes = prev.compromisos || [];
        const nuevos = [];

        filasNormalizadas.forEach((f) => {
          if (f.sinTasa || f.montoUSD == null) { sinTasa++; return; }
          if (existentes.some((c) => c.numeroPedidoOdoo === f.numero) || nuevos.some((c) => c.numeroPedidoOdoo === f.numero)) {
            omitidos++; return;
          }
          const { id: proveedorId, proveedores: nuevosProv } = emparejarPorRifONombre(proveedores, f.rif, f.contacto, "esProveedor");
          proveedores = nuevosProv;

          nuevos.push({
            id: crypto.randomUUID(),
            proveedorId,
            descripcion: f.producto ? `${f.numero} — ${f.producto}` : f.numero,
            numeroPedidoOdoo: f.numero,
            montoOriginal: f.montoUSD,
            moneda: "USD",
            formaPago: "USD",
            fechaPedido: f.fecha || new Date().toISOString().slice(0, 10),
            fechaVencimiento: f.fecha || new Date().toISOString().slice(0, 10),
            prioridad: "NORMAL",
            anulado: false,
            corridaId: null,
            bancoAsignadoId: null,
            origenOdoo: true,
            monedaOriginalOdoo: f.monedaElegida === "BS" ? "Bs" : "$",
            montoOriginalOdoo: f.monto,
            tasaConversionOdoo: f.tasaUsada
          });
          creados++;
        });

        const next = { ...prev, proveedores, compromisos: [...existentes, ...nuevos] };
        saveState(next, userId).catch(console.error);
        return next;
      });
      return { creados, omitidos, sinTasa };
    },

    /** Igual que arriba, pero para facturas de venta (crea cuentasCobrar). */
    importarFacturasOdooManual: (filasNormalizadas) => {
      let creados = 0, omitidos = 0, sinTasa = 0;
      setSt((prev) => {
        let proveedores = [...(prev.proveedores || [])];
        const existentes = prev.cuentasCobrar || [];
        const nuevas = [];

        filasNormalizadas.forEach((f) => {
          if (f.sinTasa || f.montoUSD == null) { sinTasa++; return; }
          if (existentes.some((c) => c.numeroFactura === f.numero) || nuevas.some((c) => c.numeroFactura === f.numero)) {
            omitidos++; return;
          }
          const { id: clienteId, proveedores: nuevosProv } = emparejarPorRifONombre(proveedores, f.rif, f.contacto, "esCliente");
          proveedores = nuevosProv;

          nuevas.push({
            id: crypto.randomUUID(),
            clienteId,
            descripcion: f.producto ? `${f.numero} — ${f.producto}` : f.numero,
            numeroFactura: f.numero,
            montoOriginal: f.montoUSD,
            moneda: "USD",
            fechaFactura: f.fecha || new Date().toISOString().slice(0, 10),
            fechaVencimiento: f.fecha || new Date().toISOString().slice(0, 10),
            anulado: false,
            origenOdoo: true,
            monedaOriginalOdoo: f.monedaElegida === "BS" ? "Bs" : "$",
            montoOriginalOdoo: f.monto,
            tasaConversionOdoo: f.tasaUsada
          });
          creados++;
        });

        const next = { ...prev, proveedores, cuentasCobrar: [...existentes, ...nuevas] };
        saveState(next, userId).catch(console.error);
        return next;
      });
      return { creados, omitidos, sinTasa };
    },

    /**
     * Importa pedidos de compra de Odoo como compromisos de pago (vía API).
     * @param pedidos array crudo devuelto por la Edge Function odoo-sync (pedidosCompra.muestra)
     * @param contactos array crudo de res.partner (name, vat) de la misma respuesta
     */
    importarPedidosOdoo: (pedidos, contactos) => {
      let creados = 0, omitidos = 0;
      setSt((prev) => {
        let proveedores = [...(prev.proveedores || [])];
        const compromisosExistentes = prev.compromisos || [];
        const nuevos = [];

        pedidos.forEach((p) => {
          const yaExiste = compromisosExistentes.some((c) => c.odooId === p.id && c.odooModelo === "purchase.order");
          if (yaExiste) { omitidos++; return; }

          const contacto = contactos.find((c) => c.id === p.partner_id?.[0]);
          const { id: proveedorId, proveedores: nuevosProv } = emparejarOCrearContacto(
            proveedores, contacto?.vat, contacto?.name || p.partner_id?.[1], "esProveedor"
          );
          proveedores = nuevosProv;

          nuevos.push({
            id: crypto.randomUUID(),
            proveedorId,
            descripcion: p.name,
            numeroPedidoOdoo: p.name,
            montoOriginal: Number(p.amount_total) || 0,
            moneda: "USD",
            formaPago: "USD",
            fechaPedido: p.date_order ? p.date_order.slice(0, 10) : new Date().toISOString().slice(0, 10),
            fechaVencimiento: p.date_order ? p.date_order.slice(0, 10) : new Date().toISOString().slice(0, 10),
            prioridad: "NORMAL",
            anulado: false,
            corridaId: null,
            bancoAsignadoId: null,
            odooId: p.id,
            odooModelo: "purchase.order",
            origenOdoo: true
          });
          creados++;
        });

        const next = { ...prev, proveedores, compromisos: [...compromisosExistentes, ...nuevos] };
        saveState(next, userId).catch(console.error);
        return next;
      });
      return { creados, omitidos };
    },

    /**
     * Importa facturas de venta de Odoo como cuentas por cobrar (vía API).
     * @param facturas array crudo devuelto por odoo-sync (facturasVenta.muestra)
     * @param contactos array crudo de res.partner (name, vat)
     */
    importarFacturasOdoo: (facturas, contactos) => {
      let creados = 0, omitidos = 0;
      setSt((prev) => {
        let proveedores = [...(prev.proveedores || [])];
        const cxcExistentes = prev.cuentasCobrar || [];
        const nuevas = [];

        facturas.forEach((f) => {
          const yaExiste = cxcExistentes.some((c) => c.odooId === f.id && c.odooModelo === "account.move");
          if (yaExiste) { omitidos++; return; }

          const contacto = contactos.find((c) => c.id === f.partner_id?.[0]);
          const { id: clienteId, proveedores: nuevosProv } = emparejarOCrearContacto(
            proveedores, contacto?.vat, contacto?.name || f.partner_id?.[1], "esCliente"
          );
          proveedores = nuevosProv;

          nuevas.push({
            id: crypto.randomUUID(),
            clienteId,
            descripcion: f.name,
            numeroFactura: f.name,
            montoOriginal: Number(f.amount_total) || 0,
            moneda: "USD",
            fechaFactura: f.invoice_date ? f.invoice_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            fechaVencimiento: (f.invoice_date_due || f.invoice_date || new Date().toISOString()).slice(0, 10),
            anulado: false,
            odooId: f.id,
            odooModelo: "account.move",
            origenOdoo: true
          });
          creados++;
        });

        const next = { ...prev, proveedores, cuentasCobrar: [...cxcExistentes, ...nuevas] };
        saveState(next, userId).catch(console.error);
        return next;
      });
      return { creados, omitidos };
    }
  };
}
