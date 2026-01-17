import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Gift, Zap, Calendar, TrendingUp, Award, Gamepad2, CheckCircle2, RefreshCw, Timer } from 'lucide-react';
import { format, subDays, differenceInDays, isToday, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'waste_reduction' | 'inventory_management' | 'usage_tracking' | 'streak';
}

interface DailyTask {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  type: 'check_expiry' | 'add_product' | 'scan_barcode' | 'update_inventory' | 'recipe_search';
}

interface UserStats {
  totalPoints: number;
  level: number;
  streak: number;
  wasteReduced: number;
  itemsTracked: number;
  daysActive: number;
}

// Mini Game Component
function MemoryGame({ onComplete }: { onComplete: (points: number) => void }) {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const emojis = ['🍎', '🥕', '🥛', '🍞', '🥚', '🧀', '🍌', '🥬'];

  const initializeGame = useCallback(() => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setGameComplete(false);
    setTimer(0);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      if (cards[first].emoji === cards[second].emoji) {
        setCards(prev => prev.map((card, i) => 
          i === first || i === second ? { ...card, matched: true } : card
        ));
      }
      setTimeout(() => {
        setCards(prev => prev.map((card, i) => 
          i === first || i === second ? { ...card, flipped: card.matched } : card
        ));
        setFlippedCards([]);
      }, 1000);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.matched)) {
      setGameComplete(true);
      setIsPlaying(false);
      const points = Math.max(10, 50 - moves);
      onComplete(points);
    }
  }, [cards, moves, onComplete]);

  const handleCardClick = (index: number) => {
    if (flippedCards.length >= 2 || cards[index].flipped || cards[index].matched) return;
    setCards(prev => prev.map((card, i) => i === index ? { ...card, flipped: true } : card));
    setFlippedCards(prev => [...prev, index]);
    setMoves(m => m + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> {timer}s</span>
          <span>Moves: {moves}</span>
        </div>
        <Button size="sm" variant="outline" onClick={initializeGame}>
          <RefreshCw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={`aspect-square rounded-lg text-2xl font-bold transition-all transform ${
              card.flipped || card.matched 
                ? 'bg-primary text-primary-foreground rotate-0' 
                : 'bg-muted hover:bg-muted/80 rotate-0'
            } ${card.matched ? 'opacity-60' : ''}`}
            disabled={card.flipped || card.matched}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>
      {gameComplete && (
        <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <p className="font-bold text-green-800 dark:text-green-200">
            Completed in {moves} moves! +{Math.max(10, 50 - moves)} points
          </p>
        </div>
      )}
    </div>
  );
}

export function Gamification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    level: 1,
    streak: 0,
    wasteReduced: 0,
    itemsTracked: 0,
    daysActive: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGame, setShowGame] = useState(false);

  const allAchievements: Achievement[] = [
    {
      id: 'first_product',
      title: 'Getting Started',
      description: 'Add your first product to the pantry',
      icon: Star,
      points: 10,
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      category: 'inventory_management'
    },
    {
      id: 'inventory_master',
      title: 'Inventory Master',
      description: 'Track 50 different products',
      icon: Target,
      points: 100,
      unlocked: false,
      progress: 0,
      maxProgress: 50,
      category: 'inventory_management'
    },
    {
      id: 'waste_warrior',
      title: 'Waste Warrior',
      description: 'Go 7 days without recording any waste',
      icon: Trophy,
      points: 150,
      unlocked: false,
      progress: 0,
      maxProgress: 7,
      category: 'waste_reduction'
    },
    {
      id: 'streak_keeper',
      title: 'Streak Keeper',
      description: 'Use the app for 30 consecutive days',
      icon: Zap,
      points: 200,
      unlocked: false,
      progress: 0,
      maxProgress: 30,
      category: 'streak'
    },
    {
      id: 'eco_champion',
      title: 'Eco Champion',
      description: 'Reduce waste by 90% compared to previous month',
      icon: Award,
      points: 300,
      unlocked: false,
      progress: 0,
      maxProgress: 90,
      category: 'waste_reduction'
    },
    {
      id: 'organized_pantry',
      title: 'Organized Pantry',
      description: 'Keep inventory updated for 14 consecutive days',
      icon: Calendar,
      points: 75,
      unlocked: false,
      progress: 0,
      maxProgress: 14,
      category: 'usage_tracking'
    }
  ];

  const generateDailyTasks = (): DailyTask[] => {
    const today = startOfDay(new Date()).toISOString();
    const savedTasks = localStorage.getItem(`daily_tasks_${user?.id}_${today}`);
    
    if (savedTasks) {
      return JSON.parse(savedTasks);
    }

    const allPossibleTasks: Omit<DailyTask, 'completed'>[] = [
      { id: 'check_expiry_1', title: 'Check Expiring Items', description: 'Review products expiring in the next 3 days', points: 15, type: 'check_expiry' },
      { id: 'add_product_1', title: 'Add a New Product', description: 'Add a new item to your pantry', points: 10, type: 'add_product' },
      { id: 'scan_barcode_1', title: 'Scan a Barcode', description: 'Scan a product barcode to add it quickly', points: 20, type: 'scan_barcode' },
      { id: 'update_inventory_1', title: 'Update Inventory', description: 'Update the quantity of at least 3 products', points: 15, type: 'update_inventory' },
      { id: 'recipe_search_1', title: 'Discover a Recipe', description: 'Search for a recipe using your ingredients', points: 10, type: 'recipe_search' },
      { id: 'organize_1', title: 'Organize Categories', description: 'Ensure all products have categories', points: 15, type: 'update_inventory' },
      { id: 'low_stock_1', title: 'Restock Alert', description: 'Check and restock low quantity items', points: 20, type: 'check_expiry' },
    ];

    // Pick 3-4 random tasks for today
    const shuffled = allPossibleTasks.sort(() => Math.random() - 0.5);
    const selectedTasks = shuffled.slice(0, 4).map(task => ({ ...task, completed: false }));
    
    localStorage.setItem(`daily_tasks_${user?.id}_${today}`, JSON.stringify(selectedTasks));
    return selectedTasks;
  };

  useEffect(() => {
    if (user) {
      calculateUserStats();
      setDailyTasks(generateDailyTasks());
    }
  }, [user]);

  const calculateUserStats = async () => {
    if (!user) return;

    try {
      const { data: products } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', user.id);

      const { data: wasteItems } = await supabase
        .from('waste_items')
        .select('*')
        .eq('user_id', user.id);

      const itemsTracked = products?.length || 0;
      const wasteReduced = wasteItems?.length || 0;
      
      // Calculate streak from localStorage
      const activityLog = JSON.parse(localStorage.getItem(`activity_${user.id}`) || '[]');
      
      // Log today's activity
      if (!activityLog.includes(startOfDay(new Date()).toISOString())) {
        activityLog.push(startOfDay(new Date()).toISOString());
        localStorage.setItem(`activity_${user.id}`, JSON.stringify(activityLog));
      }
      
      const streak = calculateStreak(activityLog);
      const daysActive = activityLog.length;

      const updatedAchievements = allAchievements.map(achievement => {
        let progress = 0;
        let unlocked = false;

        switch (achievement.id) {
          case 'first_product':
            progress = Math.min(itemsTracked, 1);
            unlocked = itemsTracked >= 1;
            break;
          case 'inventory_master':
            progress = Math.min(itemsTracked, 50);
            unlocked = itemsTracked >= 50;
            break;
          case 'waste_warrior':
            const recentWaste = wasteItems?.filter((entry: any) => {
              const entryDate = new Date(entry.wasted_at);
              const sevenDaysAgo = subDays(new Date(), 7);
              return entryDate >= sevenDaysAgo;
            }) || [];
            progress = recentWaste.length === 0 ? 7 : Math.max(0, 7 - recentWaste.length);
            unlocked = recentWaste.length === 0 && daysActive >= 7;
            break;
          case 'streak_keeper':
            progress = Math.min(streak, 30);
            unlocked = streak >= 30;
            break;
          case 'organized_pantry':
            progress = Math.min(daysActive, 14);
            unlocked = daysActive >= 14;
            break;
        }

        return {
          ...achievement,
          progress,
          unlocked,
          unlockedAt: unlocked ? new Date().toISOString() : undefined
        };
      });

      const savedPoints = parseInt(localStorage.getItem(`points_${user.id}`) || '0');
      const achievementPoints = updatedAchievements
        .filter(a => a.unlocked)
        .reduce((sum, a) => sum + a.points, 0);
      
      const totalPoints = savedPoints + achievementPoints;
      const level = Math.floor(totalPoints / 100) + 1;

      setUserStats({
        totalPoints,
        level,
        streak,
        wasteReduced,
        itemsTracked,
        daysActive
      });

      setAchievements(updatedAchievements);
    } catch (error) {
      console.error('Error calculating user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (activity: string[]) => {
    if (activity.length === 0) return 0;
    
    const today = startOfDay(new Date());
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = startOfDay(subDays(today, i));
      const hasActivity = activity.some(date => 
        startOfDay(new Date(date)).getTime() === checkDate.getTime()
      );
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const completeTask = (taskId: string) => {
    setDailyTasks(prev => {
      const updated = prev.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      );
      const today = startOfDay(new Date()).toISOString();
      localStorage.setItem(`daily_tasks_${user?.id}_${today}`, JSON.stringify(updated));
      return updated;
    });

    const task = dailyTasks.find(t => t.id === taskId);
    if (task) {
      const currentPoints = parseInt(localStorage.getItem(`points_${user?.id}`) || '0');
      localStorage.setItem(`points_${user?.id}`, (currentPoints + task.points).toString());
      setUserStats(prev => ({ ...prev, totalPoints: prev.totalPoints + task.points }));
      
      toast({
        title: "Task Completed! 🎉",
        description: `+${task.points} points earned!`,
      });
    }
  };

  const handleGameComplete = (points: number) => {
    const currentPoints = parseInt(localStorage.getItem(`points_${user?.id}`) || '0');
    localStorage.setItem(`points_${user?.id}`, (currentPoints + points).toString());
    setUserStats(prev => ({ 
      ...prev, 
      totalPoints: prev.totalPoints + points,
      level: Math.floor((prev.totalPoints + points) / 100) + 1
    }));
    
    toast({
      title: "Game Complete! 🎮",
      description: `You earned ${points} points!`,
    });
  };

  const getLevelProgress = () => {
    const currentLevelPoints = (userStats.level - 1) * 100;
    const nextLevelPoints = userStats.level * 100;
    const progress = userStats.totalPoints - currentLevelPoints;
    const maxProgress = nextLevelPoints - currentLevelPoints;
    return (progress / maxProgress) * 100;
  };

  const getRewards = () => {
    const rewards = [];
    if (userStats.level >= 2) rewards.push('Custom themes');
    if (userStats.level >= 3) rewards.push('Export reports');
    if (userStats.level >= 5) rewards.push('Advanced analytics');
    if (userStats.level >= 10) rewards.push('Premium features');
    return rewards;
  };

  if (loading) {
    return <div className="p-6 text-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Achievements & Rewards
          </h1>
          <p className="text-muted-foreground">Level up your pantry management skills</p>
        </div>
      </div>

      {/* User Level & Progress */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Level {userStats.level}</CardTitle>
              <p className="text-purple-100">{userStats.totalPoints} Total Points</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{Math.round(getLevelProgress())}%</div>
              <p className="text-purple-100">to next level</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={getLevelProgress()} className="h-3 bg-purple-200/30" />
          <div className="flex justify-between text-sm text-purple-100 mt-2">
            <span>Level {userStats.level}</span>
            <span>Level {userStats.level + 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">Streak</p>
                <p className="text-3xl font-bold text-orange-600">{userStats.streak} 🔥</p>
              </div>
              <Zap className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Items Tracked</p>
                <p className="text-3xl font-bold text-blue-600">{userStats.itemsTracked}</p>
              </div>
              <Target className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Days Active</p>
                <p className="text-3xl font-bold text-green-600">{userStats.daysActive}</p>
              </div>
              <Calendar className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">Waste Events</p>
                <p className="text-3xl font-bold text-red-600">{userStats.wasteReduced}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Tasks */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Today's Tasks
            <Badge variant="secondary" className="ml-2">
              {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {dailyTasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 border rounded-lg transition-all ${
                  task.completed 
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.completed ? "secondary" : "default"}>
                      +{task.points} pts
                    </Badge>
                    {!task.completed && (
                      <Button size="sm" onClick={() => completeTask(task.id)}>
                        Done
                      </Button>
                    )}
                    {task.completed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mini Game */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Gamepad2 className="w-5 h-5" />
              Memory Game
            </CardTitle>
            <Button 
              variant={showGame ? "secondary" : "default"}
              size="sm"
              onClick={() => setShowGame(!showGame)}
            >
              {showGame ? "Hide Game" : "Play Now"}
            </Button>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-300">
            Match the pantry items to earn bonus points!
          </p>
        </CardHeader>
        {showGame && (
          <CardContent>
            <MemoryGame onComplete={handleGameComplete} />
          </CardContent>
        )}
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement) => {
              const IconComponent = achievement.icon;
              return (
                <div 
                  key={achievement.id}
                  className={`p-4 border rounded-lg transition-all ${
                    achievement.unlocked 
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        achievement.unlocked ? 'bg-green-200 dark:bg-green-800' : 'bg-muted'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          achievement.unlocked ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-medium ${
                          achievement.unlocked ? 'text-green-900 dark:text-green-100' : 'text-foreground'
                        }`}>
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <Badge className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                        +{achievement.points} pts
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{achievement.progress}/{achievement.maxProgress}</span>
                    </div>
                    <Progress 
                      value={(achievement.progress / achievement.maxProgress) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      ✓ Unlocked {format(new Date(achievement.unlockedAt), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Level Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getRewards().map((reward, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">{reward}</span>
                <Badge variant="outline" className="text-green-600 border-green-300">Unlocked</Badge>
              </div>
            ))}
            
            {userStats.level < 10 && (
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                <span className="text-sm">Premium features</span>
                <Badge variant="outline">Level 10</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
