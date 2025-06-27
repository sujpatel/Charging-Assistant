from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select

class Hero(SQLModel, table=True):
    id: int | None=Field(default=None, primary_key=True)
    battery: float
    
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
    hero = Hero(battery=data.battery_level) #new row (one field: battery)
    session.add(hero) #want to insert into database
    session.commit() #sends changes to actual database
    session.refresh(hero) #pulls updates data to object
    return {"id": hero.id, "battery": hero.battery} #sends backend to frontend so it knows what was saved
    
    
@app.post("/items")
def receive_battery(data: BatteryData):
    percent = round(data.battery_level * 100)
    print(f"Received battery level: {percent}%")
    return { "message": f"Battery level: {percent}%"}
    
