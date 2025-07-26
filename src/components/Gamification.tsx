import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Gift, Zap, Calendar, TrendingUp, Award } from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';

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

interface UserStats {
  totalPoints: number;
  level: number;
  streak: number;
  wasteReduced: number;
  itemsTracked: number;
  daysActive: number;
}

export function Gamification() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    level: 1,
    streak: 0,
    wasteReduced: 0,
    itemsTracked: 0,
    daysActive: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Define achievements
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

  useEffect(() => {
    if (user) {
      calculateUserStats();
    }
  }, [user]);

  const calculateUserStats = async () => {
    if (!user) return;

    try {
      // Fetch user's products
      const { data: products } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', user.id);

      // Get waste entries from localStorage (demo)
      const wasteEntries = JSON.parse(localStorage.getItem(`waste_entries_${user.id}`) || '[]');
      
      // Get user activity from localStorage (demo)
      const userActivity = JSON.parse(localStorage.getItem(`user_activity_${user.id}`) || '[]');
      
      // Calculate stats
      const itemsTracked = products?.length || 0;
      const wasteReduced = wasteEntries.length;
      const daysActive = userActivity.length || 1;
      const streak = calculateStreak(userActivity);
      
      // Calculate total points based on achievements
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
            // Check last 7 days for no waste
            const recentWaste = wasteEntries.filter((entry: any) => {
              const entryDate = new Date(entry.waste_date);
              const sevenDaysAgo = subDays(new Date(), 7);
              return entryDate >= sevenDaysAgo;
            });
            progress = recentWaste.length === 0 ? 7 : 0;
            unlocked = recentWaste.length === 0;
            break;
          case 'streak_keeper':
            progress = Math.min(streak, 30);
            unlocked = streak >= 30;
            break;
          case 'eco_champion':
            // Simplified calculation
            progress = Math.min(wasteReduced > 0 ? 50 : 0, 90);
            unlocked = false; // Complex calculation needed
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

      const totalPoints = updatedAchievements
        .filter(a => a.unlocked)
        .reduce((sum, a) => sum + a.points, 0);

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
      
      // Store updated achievements
      localStorage.setItem(`achievements_${user.id}`, JSON.stringify(updatedAchievements));
      
    } catch (error) {
      console.error('Error calculating user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (activity: any[]) => {
    if (activity.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(today, i);
      const hasActivity = activity.some((date: string) => 
        differenceInDays(new Date(date), checkDate) === 0
      );
      
      if (hasActivity) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            Achievements & Rewards
          </h1>
          <p className="text-gray-600">Level up your pantry management skills</p>
        </div>
      </div>

      {/* User Level & Progress */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Level {userStats.level}</CardTitle>
              <p className="text-purple-100">{userStats.totalPoints} Total Points</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{Math.round(getLevelProgress())}%</div>
              <p className="text-purple-100">to next level</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={getLevelProgress()} className="h-3 bg-purple-200" />
          <div className="flex justify-between text-sm text-purple-100 mt-2">
            <span>Level {userStats.level}</span>
            <span>Level {userStats.level + 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-orange-600">{userStats.streak}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Items Tracked</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.itemsTracked}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Days Active</p>
                <p className="text-2xl font-bold text-green-600">{userStats.daysActive}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waste Events</p>
                <p className="text-2xl font-bold text-red-600">{userStats.wasteReduced}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        achievement.unlocked ? 'bg-green-100' : 'bg-gray-200'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          achievement.unlocked ? 'text-green-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-medium ${
                          achievement.unlocked ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <Badge className="bg-green-100 text-green-800">
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
                    <p className="text-xs text-green-600 mt-2">
                      Unlocked {format(new Date(achievement.unlockedAt), 'MMM dd, yyyy')}
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
            <Gift className="w-5 h-5" />
            Level Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getRewards().map((reward, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">{reward}</span>
                <Badge variant="outline">Unlocked</Badge>
              </div>
            ))}
            
            {userStats.level < 10 && (
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <span className="text-sm">Premium features</span>
                <Badge variant="outline">Level 10</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Challenge */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800">Daily Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Check expiry dates</h3>
              <p className="text-sm text-purple-600">Review all items expiring in the next 3 days</p>
            </div>
            <Button variant="outline" size="sm">
              Complete (+25 pts)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}