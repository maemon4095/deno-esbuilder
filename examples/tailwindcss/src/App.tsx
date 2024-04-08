import { h } from "preact";
// @deno-types="@types/file.d.ts"
import ReactLogo from "../public/react-logo.svg";
// @deno-types="@types/file.d.ts"
import TailwindLogo from "../public/tailwind-logo-light.svg";
export default function App() {
  return (
    <div className="w-full h-full sm:h-auto sm:w-[640px] mx-auto text-center sm:shadow bg-slate-100 sm:rounded-xl py-12 sm:mt-12">
      <h1 className="text-3xl font-bold mt-0">
        Tailwind CSS Example
      </h1>

      <div className="flex sm:flex-row flex-col items-center gap-4 justify-center">
        <a
          href="https://reactjs.org"
          target="_blank"
        >
          <img
            src={ReactLogo}
            alt="React logo"
            className="object-contain size-48"
          />
        </a>
        <a
          href="https://tailwindcss.com"
          target="_blank"
        >
          <img
            src={TailwindLogo}
            alt="Tailwind CSS logo"
            className="object-contain size-48"
          />
        </a>
      </div>

      <p>Click on the Tailwind and React logos to learn more.</p>
    </div>
  );
}
