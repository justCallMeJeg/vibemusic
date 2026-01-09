import { Clock } from "lucide-react";

function MusicCard() {
    return (
        <div className="flex w-full h-min rounded-lg px-4 py-2 hover:outline hover:outline-gray-850 hover:bg-white/3">
            <div className="flex h-min w-full gap-4">
                <img className="aspect-square h-10 rounded-lg" src="src/assets/placeholder-art.jpg" />
                <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col h-min w-full">
                        <p className="text-white text-base font-bold">Song Name</p>
                        <p className="text-gray-400 text-xs font-normal">Song Artist</p>
                    </div>        
                    <div className="flex gap-2 h-min">
                        <Clock color="gray" size={12}/>
                        <p className="text-gray-400 text-xs font-normal">00:00</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MusicCard;