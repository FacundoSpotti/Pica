# pica-sync

Sincroniza el documento de planificación de Pica en Notion con el skill de contexto
en Antigravity IDE. Cada vez que Claude actualiza el Notion, Antigravity recibe
el contexto nuevo en los próximos 5 minutos — sin intervención manual.

---

## Cómo funciona

```
Notion (Pica doc) ──→ pica-sync ──→ ~/.gemini/config/skills/pica/SKILL.md
                         ↑
                   cada 5 minutos
```

Antigravity carga el SKILL.md automáticamente cuando una tarea del agente
coincide con su descripción. El skill incluye:
- Contexto del proyecto
- Stack tecnológico
- Estructura de directorios
- Sistema de sprites
- Convenciones de código
- Contenido completo del Notion

---

## Setup (una sola vez)

### 1. Crear integración en Notion

1. Ir a https://www.notion.so/my-integrations
2. Crear nueva integración → nombrarla "pica-sync"
3. Copiar el **Internal Integration Token**
4. En la página de Pica en Notion → `···` → **Connections** → agregar "pica-sync"

### 2. Instalar dependencias

```bash
cd pica-sync
npm install
```

### 3. Configurar el token

```bash
# En tu .zshrc o .bashrc:
export NOTION_TOKEN=secret_tu_token_aquí
```

Luego recargá el shell:
```bash
source ~/.zshrc
```

### 4. Verificar que funciona

```bash
npm run sync
```

Debería aparecer:
```
✅  Skill actualizado: ~/.gemini/config/skills/pica/SKILL.md (XXX líneas)
```

---

## Uso diario

### Sincronizar una vez (manual)
```bash
npm run sync
```

### Modo daemon (recomendado — dejarlo corriendo en background)
```bash
npm run watch
```

Para correrlo en background sin que ocupe la terminal:
```bash
nohup npm run watch > pica-sync.log 2>&1 &
echo "pica-sync corriendo. PID: $!"
```

Para detenerlo:
```bash
# Ver el PID
ps aux | grep pica-sync

# Detener
kill <PID>
```

---

## Integración con el workflow de Claude

Claude (claude.ai) actualiza el Notion al final de cada sesión.
El daemon de pica-sync detecta el cambio en la próxima poll (máx. 5 min).
Antigravity carga el skill actualizado en la próxima tarea.

**Resultado:** Antigravity siempre tiene el contexto de la conversación
más reciente con Claude, sin pasos manuales.

---

## Archivos

```
pica-sync/
  sync.js        → script principal
  package.json   → dependencias
  README.md      → este archivo
```

El skill generado se escribe en:
```
~/.gemini/config/skills/pica/SKILL.md
```
