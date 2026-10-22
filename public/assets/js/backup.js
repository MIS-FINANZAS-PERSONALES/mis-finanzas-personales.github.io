// Formato v2: todo el contenido va cifrado con la clave de la sesión
// (AES-256-GCM). Se incluye la sal PBKDF2 para que, con la contraseña,
// se pueda descifrar en otro dispositivo o con otro usuario.
// El formato v1 (texto plano) se sigue aceptando al restaurar.
class Backup {
  async descargarRespaldo() {
    const accounts = await fdb.lista('accounts');
    const transactions = await fdb.lista('transactions');
    const obligations = await fdb.lista('obligations');
    const budgets = await fdb.lista('budgets');
    const goals = await fdb.lista('goals');

    const contenido = {
      username: auth.usuario,
      metadata: {
        recordCount: {
          accounts: accounts.length,
          transactions: transactions.length,
          obligations: obligations.length,
          budgets: budgets.length,
          goals: goals.length
        },
        schemaVersion: '2.0.0'
      },
      data: {
        accounts,
        transactions,
        obligations,
        budgets,
        goals
      }
    };

    const { iv, encrypted } = await fdb.cifra(contenido);
    const respaldo = {
      version: 2,
      format: 'finanzas-personales-backup',
      timestamp: new Date().toISOString(),
      kdf: { name: 'PBKDF2', hash: 'SHA-256', ...(await fdb.kdfActual()) },
      cipher: 'AES-GCM',
      iv,
      encrypted
    };

    const json = JSON.stringify(respaldo);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-respaldo-${fechaLocal()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // password: la contraseña del usuario que generó el respaldo.
  async restaurarRespaldo(archivos, password) {
    if (!archivos.length) throw new Error('Selecciona un archivo');

    const respaldo = JSON.parse(await archivos[0].text());
    if (respaldo.format !== 'finanzas-personales-backup') {
      throw new Error('Formato de respaldo inválido');
    }

    let contenido;
    if (respaldo.version === 2) {
      if (!password) throw new Error('Escribe la contraseña con la que se creó el respaldo');
      try {
        contenido = await fdb.descifraConPassword(password, respaldo.kdf.salt, respaldo.kdf.iterations || 100000, respaldo.iv, respaldo.encrypted);
      } catch (e) {
        throw new Error('Contraseña incorrecta o archivo dañado');
      }
    } else if (respaldo.version === 1) {
      contenido = respaldo;
    } else {
      throw new Error('Versión de respaldo no soportada');
    }

    const { accounts, transactions, obligations, budgets = [], goals = [] } = contenido.data;

    // Los ids cambian al insertarlos aquí: se reasignan las referencias a cuentas.
    const idsCuenta = {};
    for (const { id, ...account } of accounts) {
      idsCuenta[id] = await fdb.guarda('accounts', account);
    }
    const remapea = v => (v in idsCuenta ? idsCuenta[v] : v);

    for (const { id, ...transaction } of transactions) {
      if ('accountId' in transaction) transaction.accountId = remapea(transaction.accountId);
      if ('fromAccountId' in transaction) transaction.fromAccountId = remapea(transaction.fromAccountId);
      if ('toAccountId' in transaction) transaction.toAccountId = remapea(transaction.toAccountId);
      if (transaction.obligationId) transaction.restaurado = true;
      await fdb.guarda('transactions', transaction);
    }

    // Los pagos guardan la obligación que pagaron: se reasigna igual que las cuentas.
    const idsObligacion = {};
    for (const { id, ...obligation } of obligations) {
      idsObligacion[id] = await fdb.guarda('obligations', obligation);
    }
    for (const t of await fdb.lista('transactions')) {
      if (t.restaurado && t.obligationId in idsObligacion) {
        await fdb.guarda('transactions', { ...t, obligationId: idsObligacion[t.obligationId], restaurado: undefined });
      }
    }

    // Presupuesto: una cifra por categoría (reemplaza la actual).
    for (const b of budgets) {
      await finance.guardaPresupuesto(b.categoria, b.monto);
    }
    for (const { id, ...goal } of goals) {
      if (goal.tipo === 'emergencia') await finance.guardaMesesEmergencia(goal.meses);
      else await fdb.guarda('goals', goal);
    }

    return {
      accounts: accounts.length,
      transactions: transactions.length,
      obligations: obligations.length,
      budgets: budgets.length,
      goals: goals.length
    };
  }
}

const backup = new Backup();
