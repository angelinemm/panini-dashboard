import fs from "node:fs";
import path from "node:path";
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

const snapshotFilenamePattern = /^(\d{4})-(\d{2})-(\d{2})\.csv$/;

const fail = (file, message) => {
  throw new Error(`Invalid snapshot ${file}: ${message}`);
};

const getSnapshotDate = (file) => {
  const match = file.match(snapshotFilenamePattern);

  if (!match) {
    fail(file, "filename must use the format YYYY-MM-DD.csv");
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dateString = `${year}-${month}-${day}`;

  if (date.toISOString().slice(0, 10) !== dateString) {
    fail(file, `${dateString} is not a valid calendar date`);
  }

  return dateString;
};

const validateSnapshot = (filePath) => {
  const csvText = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(csvText, { skipEmptyLines: true });
  const displayFile = path.join(
    path.basename(path.dirname(filePath)),
    path.basename(filePath),
  );

  if (result.errors.length > 0) {
    const error = result.errors[0];
    fail(displayFile, `${error.message} (row ${error.row + 1})`);
  }

  if (result.data.length === 0) {
    fail(displayFile, "file is empty");
  }

  const firstRow = result.data[0].map((cell) =>
    String(cell).replace(/^\uFEFF/, "").trim(),
  );
  const hasHeader = firstRow.some((cell) => snapshotColumns.includes(cell));

  if (
    hasHeader &&
    snapshotColumns.some((column, index) => firstRow[index] !== column)
  ) {
    fail(
      displayFile,
      `header must be exactly: ${snapshotColumns.join(",")}`,
    );
  }

  const rows = hasHeader ? result.data.slice(1) : result.data;

  if (rows.length === 0) {
    fail(displayFile, "file has a header but no sticker rows");
  }

  const specialStickerNumbers = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + (hasHeader ? 2 : 1);

    if (row.length !== snapshotColumns.length) {
      fail(
        displayFile,
        `row ${rowNumber} has ${row.length} columns; expected ${snapshotColumns.length}`,
      );
    }

    const stickerNumber = String(row[0]).trim();

    if (stickerNumber === "") {
      fail(displayFile, `row ${rowNumber} has an empty sticker Number`);
    }

    if (!/^\d+$/.test(stickerNumber)) {
      if (specialStickerNumbers.has(stickerNumber)) {
        fail(
          displayFile,
          `row ${rowNumber} has duplicate special sticker Number "${stickerNumber}"`,
        );
      }
      specialStickerNumbers.add(stickerNumber);
    }

    const owned = String(row[1]).trim().toUpperCase();
    if (owned !== "TRUE" && owned !== "FALSE") {
      fail(displayFile, `row ${rowNumber} must have TRUE or FALSE in "On a"`);
    }
  });
};

const readSnapshotDirectory = (publicDir, directoryName) => {
  const directory = path.join(publicDir, directoryName);

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".csv"))
    .map((entry) => {
      const date = getSnapshotDate(entry.name);
      validateSnapshot(path.join(directory, entry.name));

      return {
        date,
        file: `/${directoryName}/${entry.name}`,
      };
    })
    .sort((snapshotA, snapshotB) => snapshotA.date.localeCompare(snapshotB.date));
};

export const snapshotIndexPlugin = () => {
  let root;
  let publicDir;

  const getAlbumsIndex = () => {
    const configFile = path.join(root, "albums.config.json");
    const albums = JSON.parse(fs.readFileSync(configFile, "utf8"));

    if (!Array.isArray(albums) || albums.length === 0) {
      throw new Error("albums.config.json must contain at least one album");
    }

    const albumIds = new Set();
    const albumYears = new Set();
    const indexedAlbums = albums.map((album) => {
      if (
        typeof album.id !== "string" ||
        typeof album.title !== "string" ||
        !Number.isInteger(album.year) ||
        typeof album.snapshotsDirectory !== "string"
      ) {
        throw new Error(
          "Each album needs an id, title, integer year, and snapshotsDirectory",
        );
      }

      if (albumIds.has(album.id) || albumYears.has(album.year)) {
        throw new Error(`Duplicate album id or year for ${album.id}`);
      }
      albumIds.add(album.id);
      albumYears.add(album.year);

      const discoveredSnapshots = readSnapshotDirectory(
        publicDir,
        album.snapshotsDirectory,
      );
      const snapshots =
        discoveredSnapshots.length > 0 || !album.fallbackSnapshotsDirectory
          ? discoveredSnapshots
          : readSnapshotDirectory(publicDir, album.fallbackSnapshotsDirectory);

      return {
        id: album.id,
        year: album.year,
        title: album.title,
        chases: album.chases ?? null,
        snapshots,
      };
    });

    return `${JSON.stringify(indexedAlbums, null, 2)}\n`;
  };

  return {
    name: "snapshot-index",
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    buildStart() {
      getAlbumsIndex();
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?", 1)[0] !== "/albums.json") {
          next();
          return;
        }

        try {
          response.setHeader("Content-Type", "application/json");
          response.end(getAlbumsIndex());
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "albums.json",
        source: getAlbumsIndex(),
      });
    },
  };
};
