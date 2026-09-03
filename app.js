/* T-SQL sandbox for the hospital database — runs entirely client-side.
 * SQLite is compiled to WebAssembly (sql.js), so no server/backend is needed —
 * this whole app is static files you can upload to any web host. */

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const ICON_TABLE = `<svg class="icon" viewBox="0 0 24 24" width="15" height="15"><path fill="#519aba" d="M20 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM5 9h14v2H5V9zm0 4h14v2H5v-2zm0-8h14v2H5V5zm0 12h14v2H5v-2z"/></svg>`;
const CHEV = `<svg class="chev" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>`;

const TABLE_ORDER = ["Unit", "Employee", "Patient", "Illness", "Examines", "Suffers", "HasSuffered", "Car"];

// Oversatt fran hospital-ddl.sql: IDENTITY(1,1) -> INTEGER PRIMARY KEY AUTOINCREMENT
// (maste vara pa kolumnniva i SQLite, sa den separata PK-constraint-raden togs bort
// for de tabeller som hade en auto-genererad nyckel). Ovrigt ar i stort sett oforandrat.
const SCHEMA_SQL = `
CREATE TABLE Unit (
    UnitID      INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitNo      CHAR(5) NOT NULL,
    UnitName    VARCHAR(50),
    UnitAddress VARCHAR(100),
    CONSTRAINT UQ_Unit_UnitNo UNIQUE(UnitNo)
);

CREATE TABLE Employee (
    EmployeeID      INTEGER PRIMARY KEY AUTOINCREMENT,
    EmpNo           CHAR(11) NOT NULL,
    EmpName         VARCHAR(50),
    EmpAddress      VARCHAR(100),
    EmpPhoneNumber  CHAR(10),
    EmpSalary       INT,
    UnitID          INTEGER,
    CONSTRAINT UQ_Employee_EmpNo UNIQUE(EmpNo),
    CONSTRAINT FK_Employee_Unit_UnitID FOREIGN KEY(UnitID) REFERENCES Unit(UnitID)
);

CREATE TABLE Patient (
    PatientID       INTEGER PRIMARY KEY AUTOINCREMENT,
    PatientNo       CHAR(11) NOT NULL,
    PatientName     VARCHAR(50) NOT NULL,
    PatientAddress  VARCHAR(100),
    PatientPhoneNumber CHAR(10),
    UnitID          INTEGER,
    CONSTRAINT UQ_Patient_PatientNo UNIQUE(PatientNo),
    CONSTRAINT FK_Patient_Unit_UnitID FOREIGN KEY(UnitID) REFERENCES Unit(UnitID)
);

CREATE TABLE Illness (
    IllnessID       INTEGER PRIMARY KEY AUTOINCREMENT,
    IllnessName     NVARCHAR(50) NOT NULL,
    CONSTRAINT UQ_Illness_IllnessName UNIQUE(IllnessName)
);

CREATE TABLE Examines (
    EmployeeID  INTEGER,
    PatientID   INTEGER,
    CONSTRAINT PK_Examines PRIMARY KEY(EmployeeID, PatientID),
    CONSTRAINT FK_Examines_Employee FOREIGN KEY(EmployeeID) REFERENCES Employee(EmployeeID),
    CONSTRAINT FK_Examines_Patient FOREIGN KEY(PatientID) REFERENCES Patient(PatientID)
);

CREATE TABLE Suffers (
    IllnessID   INTEGER NOT NULL,
    PatientID   INTEGER NOT NULL,
    StartDate   DATETIME,
    CONSTRAINT PK_Suffers PRIMARY KEY(IllnessID, PatientID),
    CONSTRAINT FK_Suffers_Illness FOREIGN KEY(IllnessID) REFERENCES Illness(IllnessID),
    CONSTRAINT FK_Suffers_Patient FOREIGN KEY(PatientID) REFERENCES Patient(PatientID)
);

CREATE TABLE HasSuffered (
    IllnessID   INTEGER NOT NULL,
    PatientID   INTEGER NOT NULL,
    CONSTRAINT PK_HasSuffered PRIMARY KEY(IllnessID, PatientID),
    CONSTRAINT FK_HasSuffered_Illness FOREIGN KEY(IllnessID) REFERENCES Illness(IllnessID),
    CONSTRAINT FK_HasSuffered_Patient FOREIGN KEY(PatientID) REFERENCES Patient(PatientID)
);

CREATE TABLE Car (
    CarID           INTEGER PRIMARY KEY AUTOINCREMENT,
    LicenseNo       CHAR(10) NOT NULL,
    Brand           VARCHAR(50),
    Price           INT,
    EmployeeID      INTEGER NULL,
    CONSTRAINT UQ_Car_LicenseNo UNIQUE(LicenseNo),
    CONSTRAINT FK_Car_Employee FOREIGN KEY(EmployeeID) REFERENCES Employee(EmployeeID)
);
`;

const SEED_SQL = `
INSERT INTO Unit (UnitNo, UnitName, UnitAddress) VALUES
    ('U1', 'General Surgery', 'Hospital road'),
    ('U2', 'Rehabilitation', 'Hospital road'),
    ('U3', 'Trauma', 'Care road');

INSERT INTO Employee (EmpNo, EmpName, EmpAddress, EmpPhoneNumber, EmpSalary, UnitID) VALUES
    ('E1', 'Anna', 'Lund', '111', 25000, (SELECT UnitID FROM Unit WHERE UnitNo = 'U1')),
    ('E2', 'Eva', 'Eslov', '222', 55000, (SELECT UnitID FROM Unit WHERE UnitNo = 'U1')),
    ('E3', 'Anna', 'Lund', '333', 37500, (SELECT UnitID FROM Unit WHERE UnitNo = 'U2')),
    ('E4', 'Hans', 'Eslov', '444', 18000, (SELECT UnitID FROM Unit WHERE UnitNo = 'U2')),
    ('E5', 'Eva', 'Malmo', '555', 279000, (SELECT UnitID FROM Unit WHERE UnitNo = 'U3')),
    ('E6', 'Peter', 'Dalby', '666', 32000, (SELECT UnitID FROM Unit WHERE UnitNo = 'U1'));

INSERT INTO Patient (PatientNo, PatientName, PatientAddress, PatientPhoneNumber, UnitID) VALUES
    ('PP1', 'Anna', 'Lund', '111', (SELECT UnitID FROM Unit WHERE UnitNo = 'U1')),
    ('PP2', 'Hans', 'Dalby', '777', (SELECT UnitID FROM Unit WHERE UnitNo = 'U1')),
    ('PP3', 'Bo', 'Lund', '888', (SELECT UnitID FROM Unit WHERE UnitNo = 'U3')),
    ('PP4', 'Peter', 'Lund', '999', (SELECT UnitID FROM Unit WHERE UnitNo = 'U3')),
    ('PP5', 'Anna', 'London', '100', (SELECT UnitID FROM Unit WHERE UnitNo = 'U2')),
    ('PP6', 'Anna', 'Berlin', '111', (SELECT UnitID FROM Unit WHERE UnitNo = 'U1'));

INSERT INTO Examines (EmployeeID, PatientID) VALUES
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E1'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E1'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP2')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E1'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E2'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E2'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E3'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E3'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP4')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E3'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP5')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E4'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP5')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E4'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT EmployeeID FROM Employee WHERE EmpNo = 'E4'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP4'));

INSERT INTO Illness (IllnessName) VALUES
    ('Insomnia'), ('Love sickness'), ('Cough'), ('Amnesia'), ('Incontinence'), ('Chickenpox');

INSERT INTO Suffers (IllnessID, PatientID, StartDate) VALUES
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Insomnia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1'), '1953-01-12'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Insomnia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP2'), '2006-10-16'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Insomnia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3'), '1978-01-05'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Love sickness'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1'), '2008-08-08'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Love sickness'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP2'), '2003-01-22'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Cough'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP4'), '1998-06-07'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Cough'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3'), '1978-05-23'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Incontinence'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP6'), '1989-11-11'),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Amnesia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP6'), '2010-12-09');

INSERT INTO HasSuffered (IllnessID, PatientID) VALUES
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Love sickness'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Love sickness'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP2')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Cough'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Cough'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP1')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Love sickness'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Cough'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP4')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Insomnia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP3')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Insomnia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP6')),
    ((SELECT IllnessID FROM Illness WHERE IllnessName = 'Amnesia'), (SELECT PatientID FROM Patient WHERE PatientNo = 'PP6'));

INSERT INTO Car (LicenseNo, Brand, Price, EmployeeID) VALUES
    ('C1', 'saab', 30000, NULL),
    ('C2', 'saab', 40000, (SELECT EmployeeID FROM Employee WHERE EmpNo = 'E1')),
    ('C3', 'volvo', 50000, (SELECT EmployeeID FROM Employee WHERE EmpNo = 'E2')),
    ('C4', 'volvo', 60000, (SELECT EmployeeID FROM Employee WHERE EmpNo = 'E3')),
    ('C5', 'audi', 70000, (SELECT EmployeeID FROM Employee WHERE EmpNo = 'E4')),
    ('C6', 'audi', 30000, NULL),
    ('C7', 'saab', 30000, (SELECT EmployeeID FROM Employee WHERE EmpNo = 'E5'));
`;

let SQL = null;
let db = null;
let SCHEMA = {};
let openTables = new Set();

function buildDatabase() {
  db = new SQL.Database();
  db.run(SCHEMA_SQL);
  db.run(SEED_SQL);
}

function loadSchema() {
  SCHEMA = {};
  for (const table of TABLE_ORDER) {
    const colsRes = db.exec(`PRAGMA table_info(${table});`);
    const fksRes = db.exec(`PRAGMA foreign_key_list(${table});`);
    const fkMap = {};
    if (fksRes.length) {
      // columns: id, seq, table, from, to, on_update, on_delete, match
      const cols = fksRes[0].columns;
      const fromIdx = cols.indexOf("from");
      const tableIdx = cols.indexOf("table");
      const toIdx = cols.indexOf("to");
      for (const row of fksRes[0].values) {
        fkMap[row[fromIdx]] = `${row[tableIdx]}.${row[toIdx]}`;
      }
    }
    let cols = [];
    if (colsRes.length) {
      const c = colsRes[0].columns; // cid, name, type, notnull, dflt_value, pk
      const nameIdx = c.indexOf("name");
      const typeIdx = c.indexOf("type");
      const notnullIdx = c.indexOf("notnull");
      const pkIdx = c.indexOf("pk");
      cols = colsRes[0].values.map(row => ({
        name: row[nameIdx],
        type: row[typeIdx],
        notnull: !!row[notnullIdx],
        pk: !!row[pkIdx],
        fk: fkMap[row[nameIdx]] || null,
      }));
    }
    SCHEMA[table] = cols;
  }
}

function renderTree() {
  const tree = document.getElementById("table-tree");
  tree.innerHTML = "";
  for (const table of TABLE_ORDER) {
    const cols = SCHEMA[table] || [];
    const isOpen = openTables.has(table);
    const row = document.createElement("div");
    row.className = "tree-table" + (isOpen ? " open" : "");
    row.innerHTML = `${CHEV}${ICON_TABLE}<span>${esc(table)}</span><span class="count">(${cols.length})</span>`;
    row.onclick = () => {
      if (openTables.has(table)) openTables.delete(table);
      else openTables.add(table);
      renderTree();
    };
    tree.appendChild(row);

    const colsWrap = document.createElement("div");
    colsWrap.className = "tree-columns" + (isOpen ? " open" : "");
    for (const col of cols) {
      const colRow = document.createElement("div");
      colRow.className = "tree-col";
      let badge = "";
      if (col.pk) badge = `<span class="col-icon pk" title="Primary Key">🔑</span>`;
      else if (col.fk) badge = `<span class="col-icon fk" title="Foreign Key → ${esc(col.fk)}">🔗</span>`;
      else badge = `<span class="col-icon"></span>`;
      colRow.innerHTML = `${badge}<span class="col-name">${esc(col.name)}</span><span class="col-type">${esc(col.type)}</span>`;
      colRow.title = col.fk ? `FK → ${col.fk}` : col.type;
      colRow.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll(".tree-col.selected").forEach(el => el.classList.remove("selected"));
        colRow.classList.add("selected");
        loadColumnPreview(table, col);
      };
      colsWrap.appendChild(colRow);
    }
    tree.appendChild(colsWrap);
  }
}

function loadColumnPreview(table, col) {
  const header = document.getElementById("preview-header");
  const body = document.getElementById("preview-body");
  header.textContent = `${table}.${col.name}`.toUpperCase();
  try {
    const res = db.exec(`SELECT "${col.name}" FROM "${table}" ORDER BY rowid;`);
    const values = res.length ? res[0].values.map(r => r[0]) : [];

    let badges = "";
    if (col.pk) badges += `<span class="preview-badge pk">🔑 PRIMARY KEY</span>`;
    if (col.fk) badges += `<span class="preview-badge fk" title="→ ${esc(col.fk)}">🔗 FK → ${esc(col.fk)}</span>`;

    let html = `
      <div class="preview-col-title">${esc(table)}.${esc(col.name)}</div>
      <div class="preview-col-sub">
        <span>${esc(col.type)}</span>
        <span>· ${values.length} rad(er)</span>
        ${badges}
      </div>
      <div class="preview-list">`;
    values.forEach((v, i) => {
      html += `<div class="preview-row"><span class="idx">${i + 1}</span><span class="val${v === null ? " null-val" : ""}">${v === null ? "NULL" : esc(v)}</span></div>`;
    });
    html += `</div>`;
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div class="msg-err">${esc(e.message)}</div>`;
  }
}

function setStatus(online, msg) {
  const note = document.getElementById("status-note");
  const bar = document.getElementById("statusbar-text");
  if (online) {
    note.textContent = msg || "SQLite (WASM) körs i din webbläsare — ingen server behövs";
    bar.textContent = "● hospital.db — SQLite (WebAssembly, körs i din webbläsare)";
  } else {
    note.textContent = msg || "Kunde inte starta databasmotorn";
    bar.textContent = "○ Fel vid start";
  }
}

function runQuery() {
  const sql = document.getElementById("sql-input").value;
  const body = document.getElementById("results-body");
  const meta = document.getElementById("results-meta");
  if (!sql.trim()) {
    body.innerHTML = `<div class="results-placeholder">Inget att köra.</div>`;
    meta.textContent = "";
    return;
  }
  try {
    const results = db.exec(sql);
    if (results.length) {
      const { columns, values } = results[results.length - 1];
      let html = `<table class="result-grid"><thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>`;
      if (values.length === 0) {
        html += `<tr><td colspan="${columns.length}" style="color:var(--text-dim)">(inga rader)</td></tr>`;
      } else {
        for (const row of values) {
          html += `<tr>${row.map(v => v === null ? `<td class="null-val">NULL</td>` : `<td>${esc(v)}</td>`).join("")}</tr>`;
        }
      }
      html += "</tbody></table>";
      body.innerHTML = html;
      meta.textContent = `${values.length} rad(er)`;
    } else {
      const changed = db.getRowsModified();
      body.innerHTML = `<div class="msg-ok">OK. ${changed} rad(er) påverkade.</div>`;
      meta.textContent = "";
    }
    loadSchema();
    renderTree();
  } catch (e) {
    body.innerHTML = `<div class="msg-err">${esc(e.message)}</div>`;
    meta.textContent = "";
  }
}

function resetDb() {
  if (!confirm("Återställ hospital.db till ursprungsläget?")) return;
  buildDatabase();
  loadSchema();
  renderTree();
  document.getElementById("results-body").innerHTML = `<div class="msg-ok">Databasen har återställts.</div>`;
  document.getElementById("results-meta").textContent = "";
  document.getElementById("preview-body").innerHTML = `<div class="results-placeholder">Klicka på en kolumn i trädet till vänster för att se dess data här.</div>`;
  document.getElementById("preview-header").textContent = "KOLUMN-PREVIEW";
}

function insertAtCursor(text) {
  const el = document.getElementById("sql-input");
  const start = el.selectionStart;
  const end = el.selectionEnd;
  el.value = el.value.substring(0, start) + text + el.value.substring(end);
  el.focus();
  el.selectionStart = el.selectionEnd = start + text.length;
}

window.onload = async () => {
  document.getElementById("run-btn").onclick = runQuery;
  document.getElementById("reset-btn").onclick = resetDb;
  document.getElementById("sql-input").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      insertAtCursor("  ");
    }
  });

  try {
    SQL = await initSqlJs({ locateFile: (file) => `vendor/${file}` });
    buildDatabase();
    loadSchema();
    renderTree();
    setStatus(true);
    document.getElementById("results-body").innerHTML =
      `<div class="results-placeholder">Kör en fråga för att se resultat här.</div>`;
  } catch (e) {
    setStatus(false, "Fel: " + e.message);
    document.getElementById("results-body").innerHTML =
      `<div class="msg-err">Kunde inte ladda SQLite (WebAssembly): ${esc(e.message)}</div>`;
  }
};
