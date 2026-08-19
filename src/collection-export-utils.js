export const getExportAlbums = (albums) => [...albums]
  .filter((album) => album.owned > 0)
  .sort((albumA, albumB) => albumA.year - albumB.year);
