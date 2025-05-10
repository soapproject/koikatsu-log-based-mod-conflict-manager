import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { useCallback, useState } from 'react';
import './globals.css';

type ModEntry = {
  name: string;
  path: string;
  size: number;
  created: number | null;
};

type ModConflict = {
  loaded: ModEntry;
  skipped: ModEntry[];
};

const formatSize = (size: number) => {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${size} B`;
};

const formatDate = (timestamp: number | null) =>
  timestamp ? new Date(timestamp * 1000).toLocaleString() : 'N/A';

const useParseLog = (gamePath: string) => {
  const [results, setResults] = useState<ModConflict[]>([]);
  const [error, setError] = useState('');

  const parseLog = useCallback(async () => {
    setError('');
    try {
      if (!gamePath) return;
      const log: string = await invoke('read_log_from_path', { gamePath });
      const parsed: ModConflict[] = await invoke('parse_log', {
        log,
        gamePath,
      });
      setResults(parsed);
    } catch (err) {
      console.error(err);
      setError(String(err));
    }
  }, [gamePath]);

  const removeLog = useCallback(
    (index: number, type: 'loaded' | 'skipped', path?: string) => {
      setResults(prev => {
        const updated = [...prev];

        if (type === 'loaded') {
          updated.splice(index, 1);
        } else {
          const conflict = updated[index];
          conflict.skipped = conflict.skipped.filter(mod => mod.path !== path);
          if (conflict.skipped.length === 0) {
            updated.splice(index, 1);
          }
        }

        return updated;
      });
    },
    []
  );

  const removeLoadedMod = useCallback(
    async (index: number, path: string) => {
      await invoke('delete_mods', { paths: [path] });
      removeLog(index, 'loaded');
    },
    [removeLog]
  );

  const removeSkippedMod = useCallback(
    async (index: number, path: string) => {
      await invoke('delete_mods', { paths: [path] });
      removeLog(index, 'skipped', path);
    },
    [removeLog]
  );

  return {
    parseLog,
    removeLog,
    removeLoadedMod,
    removeSkippedMod,
    results,
    error,
  };
};

function App() {
  const [gamePath, setGamePath] = useState('');
  const {
    parseLog,
    removeLog,
    removeLoadedMod,
    removeSkippedMod,
    results,
    error,
  } = useParseLog(gamePath);

  return (
    <main className='grid min-h-dvh grid-rows-[auto_1fr] overflow-auto bg-neutral-700 text-neutral-400'>
      <div className='p-4 text-center'>
        <h1>Find duplicated mods from output_log.txt</h1>
      </div>
      <div className='grid grid-rows-[auto_auto_1fr] gap-2 p-4'>
        <div className='flex gap-2'>
          <label htmlFor='gamepath_input'>Game path:</label>
          <input
            className='grow border px-2'
            id='gamepath_input'
            value={gamePath}
            onChange={e => setGamePath(e.target.value)}
          />
        </div>
        <div>
          <button className='rounded border p-2' onClick={parseLog}>
            Parse log
          </button>
        </div>
        <div className='bg-neutral-800 p-2 text-sm'>
          {error && <div className='text-red-400'>{error}</div>}

          {results.length === 0 && !error && <div>No conflicts found.</div>}

          {results.map((conflict, idx) => (
            <div
              key={idx}
              className='mb-3 space-y-1 border-b border-neutral-600 pb-2'
            >
              <div className='space-y-2'>
                <div>
                  <span className='font-bold text-lime-400'>Loaded:</span>
                </div>
                <div
                  className='ml-4 flex flex-col'
                  onDoubleClick={async () =>
                    await openPath(conflict.loaded.path)
                  }
                >
                  <div className='flex items-center gap-2'>
                    <button
                      className='rounded border px-2 py-0.5 text-xs hover:bg-red-600'
                      onClick={async e => {
                        e.stopPropagation();
                        await invoke('delete_mods', {
                          paths: conflict.skipped.map(mod => mod.path),
                        });
                        removeLog(idx, 'loaded');
                      }}
                    >
                      Remove others
                    </button>
                    <button
                      className='rounded border px-2 py-0.5 text-xs hover:bg-red-600'
                      onClick={async e => {
                        e.stopPropagation();
                        await removeLoadedMod(idx, conflict.loaded.path);
                      }}
                    >
                      Remove this
                    </button>
                    <span>{conflict.loaded.name}</span>
                  </div>
                  <span className='text-neutral-500'>
                    {conflict.loaded.path}
                  </span>
                  <span className='text-neutral-500'>{`${formatSize(conflict.loaded.size)}`}</span>
                  <span className='text-neutral-500'>{`Create at: ${formatDate(conflict.loaded.created)}`}</span>
                </div>
              </div>
              <div className='space-y-2'>
                <div>
                  <span className='font-bold text-orange-300'>Skipped:</span>
                </div>
                <div className='flex flex-col gap-2'>
                  {conflict.skipped.map((mod, i) => (
                    <div
                      key={i}
                      className='ml-4 flex flex-col'
                      onDoubleClick={async () => await openPath(mod.path)}
                    >
                      <div className='flex items-center gap-2'>
                        <button
                          className='rounded border px-2 py-0.5 text-xs hover:bg-red-600'
                          onClick={async e => {
                            e.stopPropagation();
                            await removeSkippedMod(idx, mod.path);
                          }}
                        >
                          Remove this
                        </button>
                        <span>{mod.name}</span>
                      </div>
                      <span className='text-neutral-500'>{mod.path}</span>
                      <span className='text-neutral-500'>{`${formatSize(mod.size)}`}</span>
                      <span className='text-neutral-500'>{`Create at: ${formatDate(mod.created)}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default App;
