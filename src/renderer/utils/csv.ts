import Papa from 'papaparse';

export const parseCSV = (file: File): Promise<string[]> =>
  new Promise((resolve) => {
    Papa.parse(file, {
      complete: function (results: { data: string[][] }) {
        resolve(results.data.flat().filter((i) => !!i));
      },
    });
  });
