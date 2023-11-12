import React, { useState } from "react";
export default function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>

      <div className="row">
        <a href="https://deno.com" target="_blank">
          <img
            src="https://camo.githubusercontent.com/7a37608c39244ad994b53f25944b2718658e6d6558c8309bee7696530cf82bdc/68747470733a2f2f64656e6f2e6c616e642f6c6f676f2e737667"
            className="logo deno"
            alt="Deno logo"
          />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={"/react.svg"} className="logo react" alt="React logo" />
        </a>
      </div>

      <p>Click on the Tauri, Deno, and React logos to learn more.</p>

      <form className="row">
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>

      <p>{greetMsg}</p>
    </div>
  );
}
