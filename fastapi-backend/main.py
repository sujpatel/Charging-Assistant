from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select
import httpx
import os
from fastapi import Depends
from typing import Annotated
from sqlalchemy import desc 

class Battery(SQLModel, table=True):
    id: int | None=Field(default=None, primary_key=True)
    battery: float

class EIAData(SQLModel, table=True):
    id: int | None=Field(default=None, primary_key=True)
    period: str
    type: str
    value: float
    value_units: str
    
sqlite_file_name="database.db"
sqlite_url=f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]



app = FastAPI()

@app.on_event("startup")
def on_start():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class BatteryData(BaseModel):
    battery_level: float

@app.post("/battery")
def save_battery(data: BatteryData, session: SessionDep):
    receive_battery = Battery(battery=data.battery_level) #new row (one field: battery)
    session.add(receive_battery) #want to insert into database
    session.commit() #sends changes to actual database
    session.refresh(receive_battery) #pulls updates data to object
    return {"id": receive_battery.id, "battery": receive_battery.battery} #sends backend to frontend so it knows what was saved
    
    
@app.post("/items")
def receive_battery(data: BatteryData):
    percent = round(data.battery_level * 100)
    print(f"Received battery level: {percent}%")
    return { "message": f"Battery level: {percent}%"}

API_KEY = os.getenv("EIA_API_KEY")
@app.get("/eia-data")
async def get_eia_data(session: SessionDep):
    url = "https://api.eia.gov/v2/electricity/rto/region-data/data/"
    
    params = {
        "api_key": API_KEY,
        "frequency": "hourly",
        "data[]": "value",
        "facets[respondent][]": "PJM",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 5
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
    
    if response.status_code != 200:
        return {"error": "Failed to fetch data", "status": response.status_code}
    
    data = response.json().get("response", {}).get("data", [])
    
    inserted_count = 0
    
    for item in data:
        exists = session.exec(
            select(EIAData).where(
                EIAData.period == item["period"],
                EIAData.type == item["type"]
                )
            ).first()
        if not exists:
            new_entry = EIAData(
                period=item["period"],
                type=item["type"],
                value=item["value"],
                value_units=item["value-units"]
                )
            session.add(new_entry)
            inserted_count += 1
        
    session.commit()
    
    return {"inserted": len(data)}

@app.get("/current-grid")
def get_current_grid(session: SessionDep):
    latest_data = session.exec(
        select(EIAData).order_by(desc(EIAData.period))
    ).first()
    
    if not latest_data:
        return {"error": "No grid data available yet"}
    value = latest_data.value

    if value < 80000:
        status = "low"
    elif value < 120000:
        status = "medium"
    else:
        status = "high"
    
    return {
        "period": latest_data.period,
        "value": value,
        "unit": latest_data.value_units,
        "status": status
    }
        
        
    




#run virtual environment with ..\backend\venv\Scripts\Activate.ps1
 
 #uvicorn main:app --reload
    
