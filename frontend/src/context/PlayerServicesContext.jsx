import React, { createContext, useContext, useEffect, useState } from "react";

const DEFAULT_SERVICES = [{ id: "1", title: "Thief mark", command: "mark %p" }];

const PlayerServicesContext = createContext({
  services: DEFAULT_SERVICES,
  addService: () => {},
  removeService: () => {},
  updateService: () => {},
});

export function PlayerServicesProvider({ children }) {
  const [services, setServices] = useState(DEFAULT_SERVICES);

  useEffect(() => {
    fetch("/player-services")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services || DEFAULT_SERVICES);
      })
      .catch(() => {});
  }, []);

  function save(newServices) {
    setServices(newServices);
    fetch("/player-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: newServices }),
    }).catch(() => {});
  }

  function addService(title, command) {
    save([...services, { id: Date.now().toString(), title: title.trim(), command: command.trim() }]);
  }

  function removeService(id) {
    save(services.filter((s) => s.id !== id));
  }

  function updateService(id, title, command) {
    save(services.map((s) => s.id === id ? { ...s, title: title.trim(), command: command.trim() } : s));
  }

  return (
    <PlayerServicesContext.Provider value={{ services, addService, removeService, updateService }}>
      {children}
    </PlayerServicesContext.Provider>
  );
}

export function usePlayerServices() {
  return useContext(PlayerServicesContext);
}
