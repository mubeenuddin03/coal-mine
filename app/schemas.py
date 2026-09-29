from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Union


class ReadingBase(BaseModel):
    node_id: str = Field(..., min_length=1)
    tilt_x: float = Field(..., ge=-90, le=90)
    tilt_y: float = Field(..., ge=-90, le=90)
    vibration: bool

    class Config:
        from_attributes = True


class ReadingCreate(ReadingBase):
    distance_cm: Optional[float] = Field(None, ge=0)
    displacement_cm: Optional[float] = Field(None, ge=0)
    crack_state: Optional[bool] = None

    class Config:
        from_attributes = True


class ReadingResponse(BaseModel):
    id: int
    node_id: str
    timestamp: Optional[Union[datetime, str]] = None
    tilt_x: float
    tilt_y: float
    vibration: bool
    distance_cm: Optional[float] = None
    displacement_cm: Optional[float] = None
    crack_state: Optional[bool] = None
    status: Optional[str] = None
    received_at: Union[datetime, str]
    last_seen_seconds: Optional[float] = None
    online: Optional[bool] = None

    class Config:
        from_attributes = True


class BaselineResponse(BaseModel):
    node_id: str
    tilt_x: float
    tilt_y: float
    distance_cm: Optional[float] = None
    displacement_cm: Optional[float] = None
    set_at: Union[datetime, str]

    class Config:
        from_attributes = True