# DesignCraft PowerShell HTTP Backend Server
# A zero-dependency web server for learning purposes.
# Serves static files and acts as a REST API for db.json.

$port = 5000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $PSScriptRoot) { $PSScriptRoot = Get-Location }
$projectRoot = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $PSScriptRoot "db.json"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   DesignCraft Backend Server Started    " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host "Database Path: $dbPath" -ForegroundColor Yellow
Write-Host "Listening on: http://localhost:$port/" -ForegroundColor Green
Write-Host "Press [Ctrl+C] to stop the server." -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Cyan

# Helper to write responses
function Send-Response {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [int]$StatusCode = 200,
        [string]$ContentType = "text/plain",
        [string]$Content = ""
    )
    $Response.StatusCode = $StatusCode
    $Response.ContentType = $ContentType
    
    # Enable CORS
    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

    if ($Content) {
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($Content)
        $Response.ContentLength64 = $buffer.Length
        $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    } else {
        $Response.ContentLength64 = 0
    }
    $Response.OutputStream.Close()
}

# Helper to send file responses
function Send-FileResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [string]$FilePath,
        [string]$ContentType
    )
    if (Test-Path $FilePath) {
        $Response.StatusCode = 200
        $Response.ContentType = "$ContentType; charset=utf-8"
        $Response.Headers.Add("Access-Control-Allow-Origin", "*")
        
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $Response.ContentLength64 = $bytes.Length
        $Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $Response.OutputStream.Close()
        Write-Host "Served file ($ContentType): $FilePath" -ForegroundColor Gray
    } else {
        Send-Response -Response $Response -StatusCode 404 -Content "File not found"
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
}

try {
    $listener.Start()
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        
        Write-Host "[$method] $url" -ForegroundColor DarkCyan
        
        # Handle CORS Preflight
        if ($method -eq "OPTIONS") {
            Send-Response -Response $response -StatusCode 200
            continue
        }
        
        # API Routes
        if ($url -eq "/api/boards") {
            # GET /api/boards -> Retrieve saved boards
            if ($method -eq "GET") {
                if (Test-Path $dbPath) {
                    $json = Get-Content $dbPath -Raw -Encoding UTF8
                    Send-Response -Response $response -StatusCode 200 -ContentType "application/json" -Content $json
                } else {
                    Send-Response -Response $response -StatusCode 200 -ContentType "application/json" -Content "[]"
                }
            }
            
            # POST /api/boards -> Save a new board
            elseif ($method -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                # Parse incoming data and append to DB
                try {
                    $newBoard = ConvertFrom-Json $body -ErrorAction Stop
                    
                    # Generate ID and Timestamp
                    $newBoard | Add-Member -MemberType NoteProperty -Name "id" -Value ([guid]::NewGuid().ToString()) -Force
                    $newBoard | Add-Member -MemberType NoteProperty -Name "createdAt" -Value (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") -Force
                    
                    # Read current DB
                    $boards = @()
                    if (Test-Path $dbPath) {
                        $dbContent = Get-Content $dbPath -Raw -Encoding UTF8
                        if ($dbContent) {
                            $boards = ConvertFrom-Json $dbContent
                        }
                    }
                    
                    # Ensure it is an array and add the new board
                    $boards = @($boards) + $newBoard
                    
                    # Save back to file
                    $jsonOut = ConvertTo-Json $boards -Depth 10
                    [System.IO.File]::WriteAllText($dbPath, $jsonOut, [System.Text.Encoding]::UTF8)
                    
                    $savedJson = ConvertTo-Json $newBoard -Depth 10
                    Send-Response -Response $response -StatusCode 201 -ContentType "application/json" -Content $savedJson
                    Write-Host "Saved new board: $($newBoard.name)" -ForegroundColor Green
                } catch {
                    $err = $_.Exception.Message
                    Send-Response -Response $response -StatusCode 400 -Content "Invalid Request Body: $err"
                    Write-Host "Error parsing POST request: $err" -ForegroundColor Red
                }
            }
            
            # DELETE /api/boards -> Remove a board
            # Format: DELETE /api/boards?id={guid}
            elseif ($method -eq "DELETE") {
                $id = $request.QueryString["id"]
                if (-not $id) {
                    Send-Response -Response $response -StatusCode 400 -Content "Missing 'id' parameter"
                    continue
                }
                
                if (Test-Path $dbPath) {
                    $dbContent = Get-Content $dbPath -Raw -Encoding UTF8
                    $boards = ConvertFrom-Json $dbContent
                    
                    $initialCount = @($boards).Count
                    $filteredBoards = @($boards) | Where-Object { $_.id -ne $id }
                    $finalCount = @($filteredBoards).Count
                    
                    if ($initialCount -eq $finalCount) {
                        Send-Response -Response $response -StatusCode 404 -Content "Board with ID $id not found"
                    } else {
                        $jsonOut = ConvertTo-Json $filteredBoards -Depth 10
                        [System.IO.File]::WriteAllText($dbPath, $jsonOut, [System.Text.Encoding]::UTF8)
                        
                        Send-Response -Response $response -StatusCode 200 -ContentType "application/json" -Content '{"success":true}'
                        Write-Host "Deleted board: $id" -ForegroundColor Yellow
                    }
                } else {
                    Send-Response -Response $response -StatusCode 404 -Content "No database found to delete from"
                }
            }
            
            else {
                Send-Response -Response $response -StatusCode 405 -Content "Method not allowed"
            }
        }
        
        # Static File Routes
        else {
            $filePath = ""
            $contentType = ""
            
            if ($url -eq "/") {
                $filePath = Join-Path $projectRoot "frontend/index.html"
                $contentType = "text/html"
            } elseif ($url -eq "/styles.css") {
                $filePath = Join-Path $projectRoot "frontend/styles.css"
                $contentType = "text/css"
            } elseif ($url -eq "/app.js") {
                $filePath = Join-Path $projectRoot "frontend/app.js"
                $contentType = "application/javascript"
            }
            
            if ($filePath) {
                Send-FileResponse -Response $response -FilePath $filePath -ContentType $contentType
            } else {
                Send-Response -Response $response -StatusCode 404 -Content "Not found"
            }
        }
    }
} catch {
    Write-Host "Server error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Server stopped." -ForegroundColor Yellow
}
