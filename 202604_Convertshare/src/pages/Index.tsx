import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import nycSkyline from "@/assets/nyc-skyline.png";

const Index = () => {
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      navigate(`/dashboard?address=${encodeURIComponent(address.trim())}`);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <img
        src={nycSkyline}
        alt="NYC Flag"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-8">
        <h1
          style={{ fontFamily: "'Italiana', serif", color: "#FFDF6F", transform: "scaleY(2.7)", transformOrigin: "bottom" }}
          className="text-6xl md:text-7xl font-bold tracking-tight drop-shadow-lg uppercase"
        >
          ConvertShare
        </h1>
        <form
          onSubmit={handleSubmit}
          className="flex items-center w-[90%] max-w-[520px] bg-white rounded-full shadow-2xl px-5 py-3 gap-3"
        >
          <Search className="text-gray-400 shrink-0" size={20} />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter an address (e.g. 120 Broadway)"
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-400 text-base"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};

export default Index;
