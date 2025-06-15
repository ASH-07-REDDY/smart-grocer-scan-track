import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Download } from 'lucide-react';

export function LogoGenerator() {
  const [generating, setGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generateLogo = async () => {
    setGenerating(true);
    
    try {
      console.log('Generating Smart Pantry logo...');
      
      const { data, error } = await supabase.functions.invoke('generate-smart-pantry-logo', {
        body: {}
      });

      if (error) {
        console.error('Error generating logo:', error);
        toast({
          title: "Logo Generation Failed",
          description: "Could not generate Smart Pantry logo",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.imageUrl) {
        console.log('Logo generated successfully');
        setLogoUrl(data.imageUrl);
        toast({
          title: "Logo Generated!",
          description: "Your Smart Pantry logo has been created",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: "Could not generate logo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in logo generation:', error);
      toast({
        title: "Error",
        description: "Failed to generate logo",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadLogo = () => {
    if (logoUrl) {
      const link = document.createElement('a');
      link.href = logoUrl;
      link.download = 'smart-pantry-logo.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Smart Pantry Logo Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logoUrl && (
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border">
              <img 
                src={logoUrl} 
                alt="Smart Pantry Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <Button 
              onClick={downloadLogo}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Logo
            </Button>
          </div>
        )}
        
        <Button 
          onClick={generateLogo}
          disabled={generating}
          className="w-full"
        >
          <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating Logo...' : 'Generate Smart Pantry Logo'}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          Creates a professional logo using AI for your Smart Pantry app
        </p>
      </CardContent>
    </Card>
  );
}