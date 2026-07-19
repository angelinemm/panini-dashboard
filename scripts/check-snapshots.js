import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Papa from "papaparse";

const snapshotColumns = [
  "Number",
  "On a",
  "Doubles",
  "Type",
  "Name",
  "Country",
  "Equipe",
  "Packet",
  "Fav?",
  "Top 3",
];

const snapshotsDirectory = process.argv[2] ?? "public/snapshots";
const expectedPacketSize = 5;
const ignoredPackets = new Set([0]);

const isOwned = (sticker) => {
  return String(sticker["On a"]).trim().toUpperCase() === "TRUE";
};

const isBlank = (value) => {
  return String(value ?? "").trim() === "";
};

const getPacketNumbers = (value) => {
  return String(value ?? "")
    .trim()
    .split(/[,\s;/]+/)
    .filter(Boolean)
    .map((packet) => Number.parseInt(packet, 10))
    .filter((packet) => !Number.isNaN(packet));
};

const describeSticker = (sticker) => {
  return [
    `#${String(sticker.Number).trim()}`,
    String(sticker.Type).trim(),
    String(sticker.Name).trim(),
  ]
    .filter(Boolean)
    .join(" ");
};

const parseSnapshot = (file) => {
  const csvText = fs.readFileSync(file, "utf8");
  const result = Papa.parse(csvText, { skipEmptyLines: true });
  const firstRow = (result.data[0] ?? []).map((cell) =>
    String(cell).replace(/^\uFEFF/, "").trim(),
  );
  const hasHeader =
    firstRow.includes("Number") && firstRow.includes("On a");
  const headers = hasHeader ? firstRow : snapshotColumns;
  const rows = hasHeader ? result.data.slice(1) : result.data;

  return rows.map((row, index) => ({
    line: index + (hasHeader ? 2 : 1),
    raw: row,
    sticker: Object.fromEntries(
      headers.map((header, headerIndex) => [header, row[headerIndex] ?? ""]),
    ),
  }));
};

const getSnapshotFiles = () => {
  return fs
    .readdirSync(snapshotsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".csv"))
    .map((entry) => entry.name)
    .sort();
};

const getPacketCounts = (snapshot) => {
  const counts = new Map();

  snapshot.rows.forEach(({ sticker }) => {
    [
      ...getPacketNumbers(sticker.Packet),
      ...getPacketNumbers(sticker.Doubles),
    ].forEach((packet) => {
      counts.set(packet, (counts.get(packet) ?? 0) + 1);
    });
  });

  return counts;
};

const getMissingPacketNumbers = (packetCounts) => {
  const trackedPackets = [...packetCounts.keys()].filter((packet) => {
    return !ignoredPackets.has(packet) && packet > 0;
  });
  const highestPacket = Math.max(0, ...trackedPackets);
  const missingPackets = [];

  for (let packet = 1; packet <= highestPacket; packet += 1) {
    if (!ignoredPackets.has(packet) && !packetCounts.has(packet)) {
      missingPackets.push(packet);
    }
  }

  return missingPackets;
};

const formatPacketRanges = (packets) => {
  const ranges = [];
  let rangeStart = null;
  let previousPacket = null;

  packets.forEach((packet) => {
    if (rangeStart === null) {
      rangeStart = packet;
      previousPacket = packet;
      return;
    }

    if (packet === previousPacket + 1) {
      previousPacket = packet;
      return;
    }

    ranges.push(
      rangeStart === previousPacket
        ? String(rangeStart)
        : `${rangeStart}-${previousPacket}`,
    );
    rangeStart = packet;
    previousPacket = packet;
  });

  if (rangeStart !== null) {
    ranges.push(
      rangeStart === previousPacket
        ? String(rangeStart)
        : `${rangeStart}-${previousPacket}`,
    );
  }

  return ranges.join(", ");
};

const findFirstSnapshot = (snapshots, predicate) => {
  return snapshots.find(predicate)?.name ?? "unknown";
};

const findFirstRowIssue = (snapshots, latestIssue, predicate) => {
  const latestNumber = String(latestIssue.sticker.Number).trim();

  return findFirstSnapshot(snapshots, (snapshot) => {
    return snapshot.rows.some(({ sticker }) => {
      return String(sticker.Number).trim() === latestNumber && predicate(sticker);
    });
  });
};

const printWarning = (message) => {
  console.warn(`WARN ${message}`);
};

const files = getSnapshotFiles();

if (files.length === 0) {
  console.log(`No snapshots found in ${snapshotsDirectory}`);
  process.exit(0);
}

const snapshots = files.map((name) => ({
  name,
  rows: parseSnapshot(path.join(snapshotsDirectory, name)),
}));
const latest = snapshots[snapshots.length - 1];

let warnings = 0;

snapshots.forEach((snapshot) => {
  snapshot.rows.forEach(({ line, raw }) => {
    if (raw.length !== snapshotColumns.length) {
      warnings += 1;
      printWarning(
        `${snapshot.name}:${line} has ${raw.length} columns; expected ${snapshotColumns.length}`,
      );
    }
  });
});

const latestPacketCounts = getPacketCounts(latest);
const latestMissingPackets = getMissingPacketNumbers(latestPacketCounts);

if (latestMissingPackets.length > 0) {
  warnings += 1;
  printWarning(
    `${latest.name}: missing packet number(s) ${formatPacketRanges(
      latestMissingPackets,
    )}`,
  );
}

[...latestPacketCounts.entries()]
  .filter(([packet, count]) => {
    return !ignoredPackets.has(packet) && count !== expectedPacketSize;
  })
  .sort((packetA, packetB) => packetA[0] - packetB[0])
  .forEach(([packet, count]) => {
    warnings += 1;
    const introduced = findFirstSnapshot(snapshots, (snapshot) => {
      const snapshotCount = getPacketCounts(snapshot).get(packet) ?? 0;
      return snapshotCount !== 0 && snapshotCount !== expectedPacketSize;
    });
    printWarning(
      `${latest.name}: packet ${packet} has ${count} stickers; expected ${expectedPacketSize} (introduced ${introduced})`,
    );
  });

const latestOwnedWithoutPacket = latest.rows.filter(({ sticker }) => {
  return isOwned(sticker) && isBlank(sticker.Packet);
});

latestOwnedWithoutPacket.forEach((issue) => {
  warnings += 1;
  const introduced = findFirstRowIssue(snapshots, issue, (sticker) => {
    return isOwned(sticker) && isBlank(sticker.Packet);
  });
  printWarning(
    `${latest.name}:${issue.line} ${describeSticker(issue.sticker)} is owned but has no Packet (introduced ${introduced})`,
  );
});

const latestOwnedWithoutName = latest.rows.filter(({ sticker }) => {
  return isOwned(sticker) && isBlank(sticker.Name);
});

latestOwnedWithoutName.forEach((issue) => {
  warnings += 1;
  const introduced = findFirstRowIssue(snapshots, issue, (sticker) => {
    return isOwned(sticker) && isBlank(sticker.Name);
  });
  printWarning(
    `${latest.name}:${issue.line} ${describeSticker(issue.sticker)} is owned but has no Name (introduced ${introduced})`,
  );
});

const latestUnownedWithData = latest.rows.filter(({ sticker }) => {
  return (
    !isOwned(sticker) &&
    (!isBlank(sticker.Packet) || !isBlank(sticker.Doubles))
  );
});

latestUnownedWithData.forEach((issue) => {
  warnings += 1;
  const introduced = findFirstRowIssue(snapshots, issue, (sticker) => {
    return (
      !isOwned(sticker) &&
      (!isBlank(sticker.Packet) || !isBlank(sticker.Doubles))
    );
  });
  printWarning(
    `${latest.name}:${issue.line} ${describeSticker(issue.sticker)} is not owned but has Packet/Doubles (introduced ${introduced})`,
  );
});

const latestUnownedWithName = latest.rows.filter(({ sticker }) => {
  return !isOwned(sticker) && !isBlank(sticker.Name);
});

latestUnownedWithName.forEach((issue) => {
  warnings += 1;
  const introduced = findFirstRowIssue(snapshots, issue, (sticker) => {
    return !isOwned(sticker) && !isBlank(sticker.Name);
  });
  printWarning(
    `${latest.name}:${issue.line} ${describeSticker(issue.sticker)} is not owned but has a Name (introduced ${introduced})`,
  );
});

if (warnings === 0) {
  console.log(`${latest.name}: no snapshot warnings found`);
} else {
  console.log(`${latest.name}: ${warnings} warning(s) found`);
}
