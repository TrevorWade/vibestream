import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from './Button';

interface PlaylistActionsProps {
	id: string;
	onRename: () => void;
	onChangeFolder: () => void;
	onRescan: () => void;
	onRemove: () => void;
}

export const PlaylistActions: React.FC<PlaylistActionsProps> = ({
	id, onRename, onChangeFolder, onRescan, onRemove
}) => {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, []);

	return (
		<div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
			<Button variant="ghost" size="icon" onClick={() => setOpen(o => !o)} title="Playlist actions">
				<MoreVertical size={16} />
			</Button>
			{open && (
				<div className="absolute right-0 top-6 z-20 w-44 bg-surface rounded-md border border-white/10 shadow-xl overflow-hidden">
					<div className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer" onClick={() => { setOpen(false); onRename(); }}>Rename</div>
					<div className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer" onClick={() => { setOpen(false); onChangeFolder(); }}>Change folder</div>
					<div className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer" onClick={() => { setOpen(false); onRescan(); }}>Rescan</div>
					<div className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer text-red-300 border-t border-white/10" onClick={() => { setOpen(false); onRemove(); }}>Remove</div>
				</div>
			)}
		</div>
	);
};




