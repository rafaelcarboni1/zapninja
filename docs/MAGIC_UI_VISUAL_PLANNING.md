# ZAPNINJA - Planejamento Visual com Magic UI & Shadcn

## 🎨 Visão Geral do Design System

Este documento apresenta o planejamento completo para modernizar a interface do ZAPNINJA usando **Magic UI** para animações e efeitos visuais, combinado com **Shadcn/UI** para componentes base sólidos.

---

## 🌈 Paleta de Cores e Temas

### Tema Principal - ZAPNINJA
```css
/**
 * @file: zapninja-theme.css
 * @responsibility: Definições de tema principal
 * @exports: CSS custom properties
 * @imports: none
 */

:root {
  /* Cores Primárias */
  --zn-primary: #00ff88;
  --zn-primary-foreground: #000000;
  --zn-secondary: #1a1a1a;
  --zn-secondary-foreground: #ffffff;
  
  /* Cores de Acento */
  --zn-accent-green: #00ff88;
  --zn-accent-blue: #00d4ff;
  --zn-accent-purple: #8b5cf6;
  --zn-accent-orange: #ff6b35;
  
  /* Gradientes Mágicos */
  --zn-gradient-primary: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  --zn-gradient-secondary: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  --zn-gradient-aurora: linear-gradient(
    135deg, 
    #00ff88 0%, 
    #00d4ff 25%, 
    #8b5cf6 50%, 
    #ff6b35 75%, 
    #00ff88 100%
  );
  
  /* Sombras */
  --zn-shadow-glow: 0 0 20px rgba(0, 255, 136, 0.3);
  --zn-shadow-magic: 0 8px 32px rgba(0, 212, 255, 0.2);
}
```

### Tema Dark Mode
```css
/**
 * @file: dark-theme.css
 * @responsibility: Tema escuro do ZAPNINJA
 * @exports: CSS dark theme
 * @imports: zapninja-theme.css
 */

[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --card: #1a1a1a;
  --card-foreground: #fafafa;
  --border: #262626;
  --input: #262626;
  --ring: var(--zn-primary);
}
```

---

## ✨ Magic UI Components Customizados

### 1. Animated Dashboard Cards
```typescript
/**
 * @file: magic-dashboard-card.tsx
 * @responsibility: Card animado para dashboard
 * @exports: MagicDashboardCard
 * @imports: MagicCard, GradientBorder, FloatingElements
 */

import { MagicCard } from "@/components/magicui/magic-card"
import { GradientBorder } from "@/components/magicui/gradient-border"
import { FloatingElements } from "@/components/magicui/floating-elements"

interface MagicDashboardCardProps {
  title: string
  value: string | number
  trend?: "up" | "down" | "neutral"
  icon: React.ReactNode
  gradient?: "primary" | "secondary" | "aurora"
}

export function MagicDashboardCard({ 
  title, 
  value, 
  trend, 
  icon, 
  gradient = "primary" 
}: MagicDashboardCardProps) {
  return (
    <MagicCard 
      className="relative p-6 cursor-pointer transform-gpu hover:scale-105 transition-all duration-300"
      gradientColor={gradient}
    >
      <GradientBorder className="absolute inset-0 rounded-lg" />
      <FloatingElements count={3} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-white/10">
            {icon}
          </div>
          {trend && (
            <TrendIndicator trend={trend} />
          )}
        </div>
        
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </h3>
        
        <div className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {value}
        </div>
      </div>
    </MagicCard>
  )
}
```

### 2. Interactive Session Cards
```typescript
/**
 * @file: session-card.tsx
 * @responsibility: Card interativo para sessões WhatsApp
 * @exports: SessionCard
 * @imports: HoverCard, RippleEffect, StatusIndicator
 */

interface SessionCardProps {
  session: WhatsAppSession
  onSelect: (session: WhatsAppSession) => void
  onToggleStatus: (sessionId: string) => void
}

export function SessionCard({ session, onSelect, onToggleStatus }: SessionCardProps) {
  return (
    <HoverCard 
      className="group relative overflow-hidden"
      effect="lift-glow"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/api/qr/${session.id}`} />
              <AvatarFallback>
                <SmartphoneIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-semibold">{session.session_name}</h3>
              <p className="text-sm text-muted-foreground">
                {session.phone_number || 'Não conectado'}
              </p>
            </div>
          </div>
          
          <StatusIndicator 
            active={session.is_active}
            animated={true}
          />
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mensagens hoje</span>
            <AnimatedCounter value={session.todayMessages || 0} />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usuários ativos</span>
            <AnimatedCounter value={session.activeUsers || 0} />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            onClick={() => onSelect(session)}
            className="flex-1"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleStatus(session.id)}
          >
            {session.is_active ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
      </div>
      
      <RippleEffect />
    </HoverCard>
  )
}
```

### 3. Real-time Chat Interface
```typescript
/**
 * @file: magic-chat-interface.tsx
 * @responsibility: Interface de chat com animações
 * @exports: MagicChatInterface
 * @imports: AnimatedMessages, TypingEffect, VirtualizedList
 */

export function MagicChatInterface({ conversationId }: { conversationId: string }) {
  const { messages, isLoading } = useMessages(conversationId)
  const [newMessage, setNewMessage] = useState('')

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <ChatHeader />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <VirtualizedMessageList>
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <TypingIndicator>
              <TypingEffect dots={3} />
            </TypingIndicator>
          )}
        </VirtualizedMessageList>
      </div>
      
      {/* Message Composer */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <MessageComposer
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          placeholder="Digite sua mensagem..."
          magicEffects={true}
        />
      </div>
    </div>
  )
}
```

---

## 🎭 Animações e Micro-interações

### 1. Loading States
```typescript
/**
 * @file: loading-animations.tsx
 * @responsibility: Animações de loading customizadas
 * @exports: LoadingStates
 * @imports: Lottie, CustomSpinners
 */

// Loading Skeleton com shimmer effect
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted rounded", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
    </div>
  )
}

// Loading para dados de sessão
export function SessionLoadingSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <ShimmerSkeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton className="h-4 w-32" />
              <ShimmerSkeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading para mensagens
export function MessagesLoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <ShimmerSkeleton className={`h-12 rounded-lg ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
        </div>
      ))}
    </div>
  )
}
```

### 2. Transition Effects
```css
/**
 * @file: transitions.css
 * @responsibility: Efeitos de transição customizados
 * @exports: CSS transition classes
 * @imports: none
 */

/* Page Transitions */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Magic Effects */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 255, 136, 0.6);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

## 📱 Layout Responsivo Avançado

### 1. Adaptive Dashboard Layout
```typescript
/**
 * @file: adaptive-layout.tsx
 * @responsibility: Layout adaptativo para diferentes telas
 * @exports: AdaptiveLayout
 * @imports: useMediaQuery, DynamicGrid
 */

export function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const isLargeScreen = useMediaQuery('(min-width: 1440px)')

  return (
    <div className="min-h-screen bg-background">
      {/* Header adaptativo */}
      <header className={cn(
        "border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50",
        isMobile ? "px-4 py-3" : "px-6 py-4"
      )}>
        <AdaptiveHeader />
      </header>

      {/* Layout principal */}
      <div className="flex">
        {/* Sidebar */}
        {!isMobile && (
          <aside className={cn(
            "bg-card border-r transition-all duration-300",
            isTablet ? "w-16" : "w-64"
          )}>
            <AppSidebar collapsed={isTablet} />
          </aside>
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-hidden">
          <div className={cn(
            "p-4 h-full",
            !isMobile && "p-6",
            isLargeScreen && "p-8"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation no mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t">
          <MobileBottomNavigation />
        </nav>
      )}
    </div>
  )
}
```

### 2. Dynamic Grid System
```typescript
/**
 * @file: dynamic-grid.tsx
 * @responsibility: Sistema de grid dinâmico
 * @exports: DynamicGrid
 * @imports: useWindowSize, AutoSizer
 */

interface DynamicGridProps {
  children: React.ReactNode[]
  minItemWidth?: number
  gap?: number
  aspectRatio?: number
}

export function DynamicGrid({ 
  children, 
  minItemWidth = 300, 
  gap = 16,
  aspectRatio 
}: DynamicGridProps) {
  const { width } = useWindowSize()
  
  const columns = Math.floor((width - gap) / (minItemWidth + gap))
  const actualColumns = Math.max(1, Math.min(columns, children.length))
  
  return (
    <div 
      className="grid gap-4 auto-rows-fr"
      style={{
        gridTemplateColumns: `repeat(${actualColumns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{ aspectRatio }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
```

---

## 🎨 Visual Effects Showcase

### 1. Background Effects
```typescript
/**
 * @file: background-effects.tsx
 * @responsibility: Efeitos de fundo animados
 * @exports: BackgroundEffects
 * @imports: Canvas, ParticleSystem
 */

// Particle System para fundo
export function ParticleBackground({ 
  density = "medium",
  color = "primary",
  interactive = true 
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const particles = createParticleSystem(canvas, { density, color })
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.update()
      particles.render(ctx)
      requestAnimationFrame(animate)
    }
    
    animate()
    
    if (interactive) {
      canvas.addEventListener('mousemove', particles.handleMouseMove)
    }
    
    return () => {
      if (interactive) {
        canvas.removeEventListener('mousemove', particles.handleMouseMove)
      }
    }
  }, [density, color, interactive])
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 opacity-30"
      style={{ pointerEvents: 'none' }}
    />
  )
}

// Gradient Background Animado
export function AnimatedGradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 opacity-50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 animate-gradient-shift" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/10 via-purple-500/10 to-green-500/10 animate-gradient-shift-reverse" />
    </div>
  )
}
```

### 2. Interactive Elements
```typescript
/**
 * @file: interactive-elements.tsx
 * @responsibility: Elementos interativos avançados
 * @exports: InteractiveElements
 * @imports: GestureHandler, MagneticEffect
 */

// Botão Magnético
export function MagneticButton({ 
  children, 
  strength = 50,
  ...props 
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = (e.clientX - centerX) / strength
    const deltaY = (e.clientY - centerY) / strength
    
    setPosition({ x: deltaX, y: deltaY })
  }
  
  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }
  
  return (
    <motion.button
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative transform-gpu"
      {...props}
    >
      {children}
    </motion.button>
  )
}

// Hover Card com efeito 3D
export function Hover3DCard({ children, intensity = 20 }: Hover3DCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const rotateX = ((e.clientY - centerY) / rect.height) * intensity
    const rotateY = ((e.clientX - centerX) / rect.width) * intensity
    
    setRotation({ x: -rotateX, y: rotateY })
  }
  
  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 })
  }
  
  return (
    <motion.div
      ref={ref}
      style={{ 
        transformStyle: "preserve-3d",
        perspective: "1000px"
      }}
      animate={{
        rotateX: rotation.x,
        rotateY: rotation.y
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="transform-gpu"
    >
      {children}
    </motion.div>
  )
}
```

---

## 📊 Data Visualization

### 1. Animated Charts
```typescript
/**
 * @file: animated-charts.tsx
 * @responsibility: Gráficos animados para métricas
 * @exports: AnimatedCharts
 * @imports: Recharts, FramerMotion
 */

// Gráfico de linha animado
export function AnimatedLineChart({ data, color = "primary" }: AnimatedLineChartProps) {
  const [animatedData, setAnimatedData] = useState([])
  
  useEffect(() => {
    // Animar entrada dos dados
    data.forEach((point, index) => {
      setTimeout(() => {
        setAnimatedData(prev => [...prev, point])
      }, index * 100)
    })
  }, [data])
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={animatedData}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--zn-accent-${color})`} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={`var(--zn-accent-${color})`} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
        />
        
        <Tooltip 
          content={<CustomTooltip />}
          cursor={{ stroke: `var(--zn-accent-${color})`, strokeWidth: 1 }}
        />
        
        <Area
          type="monotone"
          dataKey="value"
          stroke={`var(--zn-accent-${color})`}
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Gráfico de barras com animação stagger
export function AnimatedBarChart({ data }: AnimatedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={`var(--zn-accent-${entry.color || 'primary'})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## 🎯 Implementation Checklist

### ✅ Components Básicos
- [ ] MagicCard com gradientes
- [ ] SessionCard interativo  
- [ ] Dashboard cards animados
- [ ] Chat interface moderna
- [ ] Loading skeletons

### ✅ Animações
- [ ] Page transitions
- [ ] Hover effects
- [ ] Micro-interactions
- [ ] Loading animations
- [ ] Data visualization

### ✅ Layout System
- [ ] Adaptive layout
- [ ] Dynamic grid
- [ ] Responsive design
- [ ] Mobile optimizations
- [ ] Theme system

### ✅ Visual Effects
- [ ] Particle backgrounds
- [ ] Gradient animations
- [ ] Interactive elements
- [ ] 3D hover cards
- [ ] Magnetic buttons

---

## 🚀 Performance Optimizations

### 1. Animation Performance
```typescript
/**
 * @file: animation-performance.ts
 * @responsibility: Otimizações de performance para animações
 * @exports: AnimationUtils
 * @imports: FramerMotion
 */

// Usar transform ao invés de layout
export const performantVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 20 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

// Lazy loading para componentes pesados
export const LazyMagicComponent = lazy(() => import('./MagicComponent'))

// Otimização de re-renders
export const MemoizedMagicCard = memo(MagicCard)
```

### 2. Bundle Optimization
```typescript
/**
 * @file: bundle-optimization.ts  
 * @responsibility: Otimizações de bundle
 * @exports: OptimizedImports
 * @imports: Dynamic imports
 */

// Dynamic imports para Magic UI
export const dynamicMagicUI = {
  MagicCard: dynamic(() => import('@/components/magicui/magic-card')),
  ParticleBackground: dynamic(() => import('@/components/magicui/particle-background')),
  GradientBackground: dynamic(() => import('@/components/magicui/gradient-background'))
}

// Tree shaking otimizado
export { MagicCard } from '@/components/magicui/magic-card'
export { ParticleBackground } from '@/components/magicui/particle-background'
```

---

*Planejamento visual completo para ZAPNINJA*  
*Versão: 1.0 | Data: 2025-01-05*