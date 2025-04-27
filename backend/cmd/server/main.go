package main

import (
	"context"
	// "errors" // 移除未使用的 errors 包
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	calculatorv1 "go-next/gen/calculator/v1"
	"go-next/gen/calculator/v1/calculatorv1connect"
	greetv1 "go-next/gen/greet/v1"        // 生成的 greet 包
	"go-next/gen/greet/v1/greetv1connect" // 生成的 connect 包
)

// GreetServer 实现 greetv1connect.GreetServiceHandler 接口
type GreetServer struct{}

// Greet 实现 Greet 方法
func (s *GreetServer) Greet(
	ctx context.Context,
	req *connect.Request[greetv1.GreetRequest],
) (*connect.Response[greetv1.GreetResponse], error) {
	log.Printf("Request headers: %v", req.Header())
	log.Printf("Received request: Name=%s, Age=%d", req.Msg.Name, req.Msg.Age)

	// 在问候语中加入年龄信息
	greeting := fmt.Sprintf("你好, %s (%d岁)!", req.Msg.Name, req.Msg.Age)
	res := connect.NewResponse(&greetv1.GreetResponse{
		Greeting: greeting,
		Age:      req.Msg.Age, // 在响应中返回年龄
	})
	res.Header().Set("Greet-Version", "v1")
	return res, nil
}

// CalculatorServer 实现 calculatorv1connect.CalculatorServiceHandler 接口
type CalculatorServer struct{}

// Operate 实现计算逻辑
func (s *CalculatorServer) Operate(
	ctx context.Context,
	req *connect.Request[calculatorv1.OperateRequest],
) (*connect.Response[calculatorv1.OperateResponse], error) {
	log.Printf(
		"Received calculator request: OperandA=%.2f, OperandB=%.2f, Operation=%s",
		req.Msg.OperandA,
		req.Msg.OperandB,
		req.Msg.Operation,
	)

	var result float64
	switch req.Msg.Operation {
	case calculatorv1.Operation_OPERATION_ADD:
		result = req.Msg.OperandA + req.Msg.OperandB
	case calculatorv1.Operation_OPERATION_SUBTRACT:
		result = req.Msg.OperandA - req.Msg.OperandB
	case calculatorv1.Operation_OPERATION_MULTIPLY:
		result = req.Msg.OperandA * req.Msg.OperandB
	case calculatorv1.Operation_OPERATION_DIVIDE:
		if req.Msg.OperandB == 0 {
			// 使用 fmt.Errorf 创建错误
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("division by zero"))
		}
		result = req.Msg.OperandA / req.Msg.OperandB
	default:
		// 使用 fmt.Errorf 创建错误，确保 calculatorv1 被引用
		return nil, connect.NewError(
			connect.CodeInvalidArgument,
			fmt.Errorf("unsupported operation: %s", req.Msg.Operation.String()), // 使用 .String() 获取枚举名称
		)
	}

	res := connect.NewResponse(&calculatorv1.OperateResponse{
		Result: result,
	})
	return res, nil
}

func main() {
	greeter := &GreetServer{}
	calculator := &CalculatorServer{} // 创建 CalculatorServer 实例
	mux := chi.NewRouter()

	// 配置 CORS 中间件
	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3003"}, // 允许的前端源
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Connect-Protocol-Version"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	})
	mux.Use(corsMiddleware.Handler) // 应用 CORS 中间件

	// 注册 GreetService 处理器
	greetPath, greetHandler := greetv1connect.NewGreetServiceHandler(greeter)
	mux.Handle(greetPath+"*", greetHandler)

	// 注册 CalculatorService 处理器
	calcPath, calcHandler := calculatorv1connect.NewCalculatorServiceHandler(calculator)
	mux.Handle(calcPath+"*", calcHandler)

	log.Println("服务器正在监听 :8080...")
	err := http.ListenAndServe(
		"localhost:8080",
		h2c.NewHandler(mux, &http2.Server{}),
	)
	if err != nil {
		log.Fatalf("监听失败: %v", err)
	}
}
