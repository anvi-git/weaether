"""
Mapping dei codici meteo WMO (World Meteorological Organization)
con descrizioni in italiano, icone e stili visivi.
"""

WMO_CODES = {
    0: {
        "description": "Cielo sereno",
        "icon": "sun",
        "icon_night": "moon",
        "theme": "clear",
        "bg_gradient": "from-sky-400 via-blue-500 to-indigo-600",
        "bg_night": "from-slate-900 via-indigo-950 to-slate-900",
    },
    1: {
        "description": "Prevalentemente sereno",
        "icon": "sun-medium",
        "icon_night": "moon",
        "theme": "mostly_clear",
        "bg_gradient": "from-sky-400 via-blue-500 to-indigo-600",
        "bg_night": "from-slate-900 via-indigo-950 to-slate-900",
    },
    2: {
        "description": "Parzialmente nuvoloso",
        "icon": "cloud-sun",
        "icon_night": "cloud-moon",
        "theme": "partly_cloudy",
        "bg_gradient": "from-blue-400 via-slate-400 to-slate-600",
        "bg_night": "from-slate-900 via-slate-800 to-zinc-900",
    },
    3: {
        "description": "Coperto",
        "icon": "cloud",
        "icon_night": "cloud",
        "theme": "overcast",
        "bg_gradient": "from-slate-500 via-gray-600 to-zinc-700",
        "bg_night": "from-zinc-900 via-slate-900 to-black",
    },
    45: {
        "description": "Nebbia",
        "icon": "cloud-fog",
        "icon_night": "cloud-fog",
        "theme": "fog",
        "bg_gradient": "from-slate-400 via-zinc-500 to-gray-600",
        "bg_night": "from-zinc-900 via-slate-800 to-zinc-950",
    },
    48: {
        "description": "Nebbia con brina",
        "icon": "cloud-fog",
        "icon_night": "cloud-fog",
        "theme": "fog",
        "bg_gradient": "from-slate-400 via-zinc-500 to-gray-600",
        "bg_night": "from-zinc-900 via-slate-800 to-zinc-950",
    },
    51: {
        "description": "Pioggerella leggera",
        "icon": "cloud-drizzle",
        "icon_night": "cloud-drizzle",
        "theme": "drizzle",
        "bg_gradient": "from-sky-600 via-slate-600 to-gray-700",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    53: {
        "description": "Pioggerella moderata",
        "icon": "cloud-drizzle",
        "icon_night": "cloud-drizzle",
        "theme": "drizzle",
        "bg_gradient": "from-sky-700 via-slate-700 to-gray-800",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    55: {
        "description": "Pioggerella densa",
        "icon": "cloud-drizzle",
        "icon_night": "cloud-drizzle",
        "theme": "drizzle",
        "bg_gradient": "from-sky-700 via-slate-700 to-gray-800",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    56: {
        "description": "Pioviggine congelantesi leggera",
        "icon": "cloud-hail",
        "icon_night": "cloud-hail",
        "theme": "freezing_drizzle",
        "bg_gradient": "from-cyan-700 via-slate-700 to-blue-900",
        "bg_night": "from-slate-950 via-cyan-950 to-slate-900",
    },
    57: {
        "description": "Pioviggine congelantesi fitta",
        "icon": "cloud-hail",
        "icon_night": "cloud-hail",
        "theme": "freezing_drizzle",
        "bg_gradient": "from-cyan-700 via-slate-700 to-blue-900",
        "bg_night": "from-slate-950 via-cyan-950 to-slate-900",
    },
    61: {
        "description": "Pioggia debole",
        "icon": "cloud-rain",
        "icon_night": "cloud-rain",
        "theme": "rain",
        "bg_gradient": "from-blue-600 via-slate-600 to-slate-800",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    63: {
        "description": "Pioggia moderata",
        "icon": "cloud-rain",
        "icon_night": "cloud-rain",
        "theme": "rain",
        "bg_gradient": "from-blue-700 via-slate-700 to-slate-900",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    65: {
        "description": "Pioggia forte",
        "icon": "cloud-rain",
        "icon_night": "cloud-rain",
        "theme": "heavy_rain",
        "bg_gradient": "from-blue-800 via-slate-800 to-slate-950",
        "bg_night": "from-slate-950 via-blue-950 to-black",
    },
    66: {
        "description": "Pioggia congelantesi leggera",
        "icon": "cloud-hail",
        "icon_night": "cloud-hail",
        "theme": "freezing_rain",
        "bg_gradient": "from-cyan-800 via-slate-800 to-slate-950",
        "bg_night": "from-slate-950 via-cyan-950 to-black",
    },
    67: {
        "description": "Pioggia congelantesi intensa",
        "icon": "cloud-hail",
        "icon_night": "cloud-hail",
        "theme": "freezing_rain",
        "bg_gradient": "from-cyan-800 via-slate-800 to-slate-950",
        "bg_night": "from-slate-950 via-cyan-950 to-black",
    },
    71: {
        "description": "Neve leggera",
        "icon": "cloud-snow",
        "icon_night": "cloud-snow",
        "theme": "snow",
        "bg_gradient": "from-blue-200 via-indigo-300 to-slate-400",
        "bg_night": "from-slate-900 via-slate-800 to-indigo-950",
    },
    73: {
        "description": "Neve moderata",
        "icon": "cloud-snow",
        "icon_night": "cloud-snow",
        "theme": "snow",
        "bg_gradient": "from-blue-300 via-indigo-400 to-slate-500",
        "bg_night": "from-slate-900 via-slate-800 to-indigo-950",
    },
    75: {
        "description": "Neve intensa",
        "icon": "snowflake",
        "icon_night": "snowflake",
        "theme": "heavy_snow",
        "bg_gradient": "from-blue-400 via-indigo-500 to-slate-600",
        "bg_night": "from-slate-950 via-slate-900 to-indigo-950",
    },
    77: {
        "description": "Granelli di neve",
        "icon": "snowflake",
        "icon_night": "snowflake",
        "theme": "snow",
        "bg_gradient": "from-blue-300 via-indigo-400 to-slate-500",
        "bg_night": "from-slate-900 via-slate-800 to-indigo-950",
    },
    80: {
        "description": "Rovesci di pioggia leggeri",
        "icon": "cloud-rain-wind",
        "icon_night": "cloud-rain-wind",
        "theme": "showers",
        "bg_gradient": "from-blue-600 via-slate-700 to-gray-800",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    81: {
        "description": "Rovesci di pioggia moderati",
        "icon": "cloud-rain-wind",
        "icon_night": "cloud-rain-wind",
        "theme": "showers",
        "bg_gradient": "from-blue-700 via-slate-800 to-gray-900",
        "bg_night": "from-slate-950 via-blue-950 to-slate-900",
    },
    82: {
        "description": "Rovesci di pioggia violenti",
        "icon": "cloud-rain-wind",
        "icon_night": "cloud-rain-wind",
        "theme": "heavy_showers",
        "bg_gradient": "from-blue-900 via-slate-900 to-black",
        "bg_night": "from-slate-950 via-indigo-950 to-black",
    },
    85: {
        "description": "Rovesci di neve leggeri",
        "icon": "cloud-snow",
        "icon_night": "cloud-snow",
        "theme": "snow_showers",
        "bg_gradient": "from-slate-400 via-indigo-500 to-blue-700",
        "bg_night": "from-slate-900 via-indigo-950 to-slate-950",
    },
    86: {
        "description": "Rovesci di neve forti",
        "icon": "cloud-snow",
        "icon_night": "cloud-snow",
        "theme": "snow_showers",
        "bg_gradient": "from-slate-500 via-indigo-600 to-blue-800",
        "bg_night": "from-slate-950 via-indigo-950 to-black",
    },
    95: {
        "description": "Temporale leggero o moderato",
        "icon": "cloud-lightning",
        "icon_night": "cloud-lightning",
        "theme": "thunderstorm",
        "bg_gradient": "from-purple-800 via-slate-800 to-gray-900",
        "bg_night": "from-purple-950 via-slate-950 to-black",
    },
    96: {
        "description": "Temporale con grandine leggera",
        "icon": "cloud-lightning",
        "icon_night": "cloud-lightning",
        "theme": "thunderstorm",
        "bg_gradient": "from-purple-900 via-slate-900 to-black",
        "bg_night": "from-purple-950 via-slate-950 to-black",
    },
    99: {
        "description": "Temporale con grandine pesante",
        "icon": "cloud-lightning",
        "icon_night": "cloud-lightning",
        "theme": "thunderstorm",
        "bg_gradient": "from-purple-950 via-red-950 to-black",
        "bg_night": "from-purple-950 via-zinc-950 to-black",
    },
}

def get_weather_info(code: int, is_day: int = 1) -> dict:
    info = WMO_CODES.get(code, {
        "description": "Variabile",
        "icon": "cloud",
        "icon_night": "cloud",
        "theme": "variable",
        "bg_gradient": "from-blue-500 via-indigo-500 to-slate-700",
        "bg_night": "from-slate-900 via-indigo-950 to-slate-950"
    })
    
    selected_icon = info["icon"] if is_day else info["icon_night"]
    selected_bg = info["bg_gradient"] if is_day else info["bg_night"]
    
    return {
        "code": code,
        "description": info["description"],
        "icon": selected_icon,
        "theme": info["theme"],
        "bg_gradient": selected_bg,
        "is_day": bool(is_day)
    }

def get_aqi_level(european_aqi: float | None) -> dict:
    """
    Ritorna la valutazione dell'indice europeo di qualità dell'aria (EAQI).
    1: Molto Buona
    2: Buona
    3: Moderata
    4: Scarsa
    5: Molto Scarsa
    """
    if european_aqi is None:
        return {"level": 0, "label": "Dato non disponibile", "color": "text-gray-400", "bg": "bg-gray-500/20", "border": "border-gray-500/30"}
    
    val = round(european_aqi)
    if val <= 20:
        return {"level": 1, "label": "Eccellente", "color": "text-emerald-400", "bg": "bg-emerald-500/20", "border": "border-emerald-500/30", "bar_color": "bg-emerald-500"}
    elif val <= 40:
        return {"level": 2, "label": "Buona", "color": "text-green-400", "bg": "bg-green-500/20", "border": "border-green-500/30", "bar_color": "bg-green-500"}
    elif val <= 60:
        return {"level": 3, "label": "Moderata", "color": "text-yellow-400", "bg": "bg-yellow-500/20", "border": "border-yellow-500/30", "bar_color": "bg-yellow-500"}
    elif val <= 80:
        return {"level": 4, "label": "Scarsa", "color": "text-orange-400", "bg": "bg-orange-500/20", "border": "border-orange-500/30", "bar_color": "bg-orange-500"}
    elif val <= 100:
        return {"level": 5, "label": "Molto Scarsa", "color": "text-rose-500", "bg": "bg-rose-500/20", "border": "border-rose-500/30", "bar_color": "bg-rose-500"}
    else:
        return {"level": 6, "label": "Pericolosa", "color": "text-purple-500", "bg": "bg-purple-500/20", "border": "border-purple-500/30", "bar_color": "bg-purple-600"}

def get_wind_direction_label(degrees: float | None) -> str:
    """Ritorna la direzione cardinale del vento in italiano a partire dai gradi."""
    if degrees is None:
        return "-"
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(degrees / 22.5) % 16
    return directions[idx]

