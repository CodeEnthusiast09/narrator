import { usePlayer } from '@/hooks/usePlayer';
import { BookPicker } from '@/components/book-picker';
import { Player } from '@/components/player';

export default function App() {
  const player = usePlayer();

  if (player.status === 'idle') {
    return <BookPicker onFile={player.openFile} error={player.error} />;
  }

  return <Player player={player} />;
}
