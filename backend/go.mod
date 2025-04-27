module go-next

go 1.24.2

require (
	connectrpc.com/connect v1.18.1
	github.com/go-chi/chi/v5 v5.2.1
	github.com/go-chi/cors v1.2.1
	golang.org/x/net v0.23.0
	google.golang.org/protobuf v1.36.6
)

require golang.org/x/text v0.14.0 // indirect

replace go-next => ../
