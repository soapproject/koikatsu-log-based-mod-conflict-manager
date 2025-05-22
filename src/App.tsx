import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import cn from './cn';
import './globals.css';

type ManifestData = {
  guid: string;
  name?: string;
  version?: string;
  author?: string;
  description?: string;
};

type ModEntry = {
  name: string;
  path: string;
  size: number;
  created: number | null;
  manifest?: ManifestData;
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

const isSizeDuplicate = (conflict: ModConflict, size: number) => {
  const allSizes = [
    conflict.loaded.size,
    ...conflict.skipped.map(mod => mod.size),
  ];
  return allSizes.filter(s => s === size).length > 1;
};

const isSideloader = (path: string) => path.includes('Sideloader');

// Load manifest lazily only when the component becomes visible
// 懶載入 manifest：當元件進入畫面時才載入
const useManifestLoader = (
  path: string,
  onLoad: (manifest: ManifestData) => void
) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Detect when the element becomes visible
  // 使用 IntersectionObserver 偵測可視範圍
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      {
        rootMargin: '200px',
      }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Trigger manifest load after short delay
  // 當進入視窗後延遲載入 manifest
  useEffect(() => {
    if (!visible || hasLoaded) return;

    timeoutRef.current = setTimeout(() => {
      invoke<ManifestData>('read_manifest_from_mod_file', { path })
        .then(manifest => {
          onLoad(manifest);
          setHasLoaded(true);
        })
        .catch(e => {
          console.error(`Failed to load manifest for ${path}:`, e);
        });
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, hasLoaded, path, onLoad]);

  return ref;
};

// Hook for parsing the mod conflict log
// 用來解析 mod 衝突 log 的自定義 Hook
const useParseLog = (gamePath: string) => {
  const [results, setResults] = useState<ModConflict[]>([]);
  const [error, setError] = useState('');

  const parseLog = useCallback(async () => {
    setError('');
    if (!gamePath) return;
    try {
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

  const removeOtherMods = useCallback(
    async (index: number, skipped: ModEntry[]) => {
      const paths = skipped.map(mod => mod.path);
      await invoke('delete_mods', { paths });
      removeLog(index, 'loaded');
    },
    [removeLog]
  );

  return {
    parseLog,
    removeLoadedMod,
    removeSkippedMod,
    removeOtherMods,
    setResults,
    results,
    error,
  };
};

// Component for rendering one ModEntry (either loaded or skipped)
// 用來顯示單個模組的 UI 元件
interface ModItemProps extends HTMLAttributes<HTMLElement> {
  mod: ModEntry;
  index: number;
  type: 'loaded' | 'skipped';
  onRemove: () => void;
  onManifestLoad: (manifest: ManifestData) => void;
  highlightDuplicateSize?: boolean;
}
function ModItem({
  mod,
  onRemove,
  onManifestLoad,
  highlightDuplicateSize,
}: ModItemProps) {
  const ref = useManifestLoader(mod.path, onManifestLoad);

  return (
    <div
      ref={ref}
      className='ml-4 flex cursor-pointer flex-row items-start justify-between gap-4 border-b border-neutral-600 py-1'
      onDoubleClick={async () => await openPath(mod.path)}
    >
      {/* Left column: mod info / 左邊顯示檔案資訊 */}
      <div className='flex flex-col'>
        <div className='flex items-center gap-2'>
          <button
            className='rounded border px-2 py-0.5 text-xs hover:bg-red-600'
            onClick={e => {
              e.stopPropagation();
              onRemove();
            }}
          >
            Remove this
          </button>
          <span>{mod.name}</span>
        </div>

        <span
          className={cn('text-neutral-500', {
            'text-cyan-900': isSideloader(mod.path),
          })}
        >
          {mod.path}
        </span>

        <span
          className={cn('text-neutral-500', {
            'text-red-400': highlightDuplicateSize,
          })}
        >
          {formatSize(mod.size)}
        </span>

        <span className='text-neutral-500'>
          {`Create at: ${formatDate(mod.created)}`}
        </span>
      </div>

      {/* Right column: manifest info / 右邊顯示 manifest 資訊 */}
      {mod.manifest && (
        <div className='min-w-80 text-xs text-neutral-400'>
          <div className='flex gap-4 font-bold text-neutral-300'>
            <h3 className='w-20'>guid</h3>
            <span>{mod.manifest.guid}</span>
          </div>
          <div className='flex gap-4 font-bold text-neutral-300'>
            <h3 className='w-20'>version</h3>
            <span>{mod.manifest.version}</span>
          </div>
          <div className='flex gap-4 font-bold text-neutral-300'>
            <h3 className='w-20'>author</h3>
            <span>{mod.manifest.author}</span>
          </div>
          <div className='flex gap-4'>
            <h3 className='w-20'>name</h3>
            <span>{mod.manifest.name}</span>
          </div>
          <div className='flex gap-4'>
            <h3 className='w-20'>description</h3>
            <span>{mod.manifest.description}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Root app entry
// 主應用程式元件
function App() {
  const [gamePath, setGamePath] = useState('');
  const {
    parseLog,
    removeLoadedMod,
    removeSkippedMod,
    removeOtherMods,
    setResults,
    results,
    error,
  } = useParseLog(gamePath);

  // Set manifest data in nested state (for loaded or skipped mods)
  // 設定 manifest 到指定 mod（支援 nested 結構）
  const setManifest = useCallback(
    (
      idx: number,
      type: 'loaded' | 'skipped',
      manifest: ManifestData,
      skippedIndex?: number
    ) => {
      const updater = (prev: ModConflict[]) => {
        const updated = [...prev];
        const conflict = { ...updated[idx] };

        if (type === 'loaded') {
          conflict.loaded = { ...conflict.loaded, manifest };
        } else if (typeof skippedIndex === 'number') {
          const newSkipped = [...conflict.skipped];
          newSkipped[skippedIndex] = {
            ...newSkipped[skippedIndex],
            manifest,
          };
          conflict.skipped = newSkipped;
        }

        updated[idx] = conflict;
        return updated;
      };

      setResults(updater);
    },
    [setResults]
  );

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
              key={conflict.loaded.path}
              className='mb-3 space-y-1 border-b border-neutral-600 pb-2'
            >
              <div className='space-y-2'>
                <div className='font-bold text-lime-400'>Loaded:</div>
                <ModItem
                  index={idx}
                  mod={conflict.loaded}
                  type='loaded'
                  onRemove={async () =>
                    await removeLoadedMod(idx, conflict.loaded.path)
                  }
                  onManifestLoad={manifest =>
                    setManifest(idx, 'loaded', manifest)
                  }
                  highlightDuplicateSize={isSizeDuplicate(
                    conflict,
                    conflict.loaded.size
                  )}
                />
                <div className='mt-1 ml-4 flex items-center gap-2'>
                  <button
                    className='rounded border px-2 py-0.5 text-xs hover:bg-red-600'
                    onClick={async e => {
                      e.stopPropagation();
                      await removeOtherMods(idx, conflict.skipped);
                    }}
                  >
                    Remove others
                  </button>
                  <span className='text-xs text-neutral-500'>
                    (Remove all skipped mods for this conflict)
                  </span>
                </div>
              </div>

              <div className='mt-2 space-y-2'>
                <div className='font-bold text-orange-300'>Skipped:</div>
                <div className='flex flex-col gap-2'>
                  {conflict.skipped.map((mod, i) => (
                    <ModItem
                      key={mod.path}
                      mod={mod}
                      index={i}
                      type='skipped'
                      onRemove={async () =>
                        await removeSkippedMod(idx, mod.path)
                      }
                      onManifestLoad={manifest =>
                        setManifest(idx, 'skipped', manifest, i)
                      }
                      highlightDuplicateSize={isSizeDuplicate(
                        conflict,
                        mod.size
                      )}
                    />
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
