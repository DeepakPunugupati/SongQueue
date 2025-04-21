{
    "bindings": [
      {
        "authLevel": "anonymous",
        "type": "httpTrigger",
        "direction": "in",
        "name": "req",
        "methods": ["get"],
        "route": "getSongs"
      },
      {
        "type": "http",
        "direction": "out",
        "name": "res"
      }
    ]
  }
  