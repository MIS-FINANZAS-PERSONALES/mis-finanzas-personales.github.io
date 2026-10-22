# Modelo financiero — Finanzas Personales

## Definiciones

| Concepto | Definición |
|----------|-----------|
| **Saldo registrado** | balanceInitial + ingresos confirmados - gastos confirmados |
| **Dinero disponible hoy** | Suma de saldos registrados de todas las cuentas |
| **Dinero comprometido** | Obligaciones pendientes + gastos pendientes |
| **Dinero proyectado** | Saldo hoy + flujos futuros confirmados - obligaciones futuras |
| **Ingresos previstos** | type='income', status='pending' |
| **Ingresos recibidos** | type='income', status='confirmed' |
| **Gastos previstos** | type='expense', status='pending' |
| **Gastos realizados** | type='expense', status='confirmed' |

## Reglas financieras

### 1. Transferencia entre cuentas propias

- Genera dos movimientos: type='transfer' (uno negativo, uno positivo)
- NO aparece en ingresos consolidados
- NO aparece en gastos consolidados
- Total consolidado NO cambia

### 2. Factura cargada ≠ Gasto pagado

Estados:
- `uploaded` → Archivo cargado
- `extracted` → Datos extraídos
- `confirmed` → Crea gasto pendiente (status='pending')
- `linked` → Movimiento de pago registrado

Dinero disponible HOY:
- Solo se reduce cuando pago se confirma (status='confirmed')
- Factura con status='pending' NO reduce disponible

### 3. Proyección sin duplicados

- Solo suma movimientos con fecha POSTERIOR a hoy
- Los movimientos históricos ya están en saldo registrado
- NO re-suma ingresos pasados

### 4. Obligación ≠ Gasto

Son entidades separadas:
- Obligación: tiene amountPaid + amountPending
- Gasto: es un movimiento (income/expense)
- Cada pago parcial = un gasto confirmado

### 5. Tarjeta de crédito

- Tratada como cuenta con saldo negativo
- Pago de TC = transferencia desde cuenta propia a TC
- Cambio disponible = -monto del pago

### 6. Saldo inicial

- Cada cuenta tiene `balanceInitial` definido por usuario
- Saldo registrado PARTE de ahí (no suma otros históricos)

## Casos de prueba

### CASO 1: Saldo registrado simple
```
balanceInitial = $1,000,000
+ income confirmed $500,000
- expense confirmed $200,000
= Saldo registrado: $1,300,000 ✓
```

### CASO 2: Transferencia entre cuentas propias
```
Cuenta A: $1,300,000 → transfiere $100,000 → Cuenta B: $0
Resultado:
  - Cuenta A: $1,200,000 ✓
  - Cuenta B: $100,000 ✓
  - Total consolidado: $1,300,000 (SIN CAMBIOS) ✓
  - Ingresos consolidados: $0 (transfer no es ingreso) ✓
```

### CASO 3: Factura sin pagar (NO reduce dinero)
```
Factura de $350,000 en status='extracted'
→ processInvoiceToPayment() → crea gasto status='pending'
Dinero disponible HOY: SIN CAMBIOS ✓
Dinero proyectado (con pendientes): -$350,000 ✓
```

### CASO 4: Pago de factura (SÍ reduce dinero)
```
payInvoice($350,000) → gasto status='confirmed'
Dinero disponible HOY: -$350,000 ✓
```

### CASO 5: Obligación con pagos parciales
```
Obligación: $1,000,000
Primer pago: $400,000
  → amountPaid=$400,000
  → amountPending=$600,000
  → status='partially_paid' ✓

Segundo pago: $600,000
  → amountPaid=$1,000,000
  → amountPending=$0
  → status='fully_paid' ✓
```

### CASO 6: Proyección sin duplicar movimientos pasados
```
Saldo hoy: $950,000
+ Ingreso futuro (2024-11-01): $800,000
- Obligación vencida (2024-11-05): $0 (ya pagada)
= Proyección 2024-11-15: $1,750,000 ✓
(NO re-suma ingresos históricos ya en saldo) ✓
```

### CASO 7: Transferencia en proyección
```
Cuenta A saldo: $500,000
Transferencia futura: $200,000 a Cuenta B
Proyección Cuenta A: $300,000 ✓
Proyección Cuenta B: +$200,000 ✓
Total proyectado consolidado: SIN CAMBIOS ✓
```

## Fórmulas

### Saldo registrado por cuenta
```javascript
balance[accountId] = balanceInitial[accountId]
                   + sum(transactions where type='income' and status='confirmed' and accountId)
                   - sum(transactions where type='expense' and status='confirmed' and accountId)
```

### Dinero disponible hoy (consolidado)
```javascript
available = sum(balance[accountId] for all accountId)
```

### Dinero comprometido
```javascript
committed = sum(obligation.amountPending for all pending/partially_paid obligations)
          + sum(transaction.amount where type='expense' and status='pending')
```

### Dinero proyectado a X días
```javascript
hoy = TODAY
futuro = TODAY + X days

proyectado = available
           + sum(income confirmada where date > hoy and date <= futuro)
           - sum(expense confirmada where date > hoy and date <= futuro)
           - sum(obligation.amountPending where dueDate <= futuro and (pending OR partially_paid))
```

## Tratamiento de casos especiales

### Pagos parciales
- Cada pago es un gasto confirmado independiente
- La obligación se actualiza: amountPaid += pago, amountPending -= pago
- Status cambia: pending → partially_paid → fully_paid

### Rectificaciones
- Si se debe revertir un gasto: marcar como status='reversed'
- La proyección EXCLUYE movimientos reversed
- La obligación se mantiene como está (no se auto-revierte)

### Movimientos futuros confirmados
- Un ingreso con status='confirmed' pero fecha futura SÍ cuenta en proyección
- Un gasto con status='confirmed' pero fecha futura SÍ se resta en proyección
- (Diferente de 'pending' = no confirmado todavía)

## Validaciones

Antes de guardar:
- [ ] Monto > 0 (excepto transferencias que pueden ser 0?)
- [ ] Fecha válida
- [ ] Cuenta existe (para transactions)
- [ ] Obligación existe (para pagos)
- [ ] amountPaid <= amountTotal (en obligaciones)

## API financiera

```javascript
await finance.saldoRegistrado()          // { [accountId]: balance }
await finance.dineroDisponibleHoy()      // number
await finance.dineroComprometido()       // number
await finance.dineroProyectado(daysAhead=30)  // number
await finance.registraCuenta(...)
await finance.registraMovimiento(...)
await finance.registraObligacion(...)
await finance.pagaObligacion(...)
```
