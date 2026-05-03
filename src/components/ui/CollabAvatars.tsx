/**
 * Stacked overlapping avatars.
 * Pixel-matched to the HTML reference: the first avatar takes positional flow,
 * the rest are absolutely positioned at +70% offset to overlap by 30%.
 */
export interface CollabUser {
  id: string;
  name: string;
  color: string;
  photoURL?: string;
}

interface Props {
  users: CollabUser[];
  size?: number;
  /** Max number of avatars to show before collapsing into "+N" */
  max?: number;
}

export default function CollabAvatars({ users, size = 28, max = 3 }: Props) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const containerWidth = users.length * (size * 0.7) + size * 0.3;

  return (
    <div style={{ display: 'flex', position: 'relative', width: containerWidth }}>
      {visible.map((u, i) => (
        <div
          key={u.id}
          className="avatar"
          style={{
            background: u.color,
            width: size,
            height: size,
            fontSize: size * 0.38,
            position: i === 0 ? 'relative' : 'absolute',
            left: i * (size * 0.7),
            zIndex: users.length - i,
            border: '2px solid white',
            backgroundImage: u.photoURL ? `url(${u.photoURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: u.photoURL ? 'transparent' : 'white',
          }}
        >
          {!u.photoURL && u.name[0]}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="avatar"
          style={{
            background: '#9CA3AF',
            width: size,
            height: size,
            fontSize: size * 0.35,
            position: 'absolute',
            left: max * (size * 0.7),
            zIndex: 0,
            border: '2px solid white',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
