using System.Collections.Generic;
using UnityEngine;

namespace StoryAR.Unity
{
    public class RoomLightingController : MonoBehaviour
    {
        [SerializeField] private Light mainDirectionalLight;

        public void ApplyRoomLighting(LightingDTO lighting)
        {
            if (lighting == null) return;

            if (mainDirectionalLight != null)
            {
                mainDirectionalLight.intensity = Mathf.Clamp(lighting.intensity, 0.4f, 2.0f);

                if (lighting.direction != null && lighting.direction.Length >= 3)
                {
                    Vector3 dir = new Vector3(lighting.direction[0], -lighting.direction[1], lighting.direction[2]);
                    mainDirectionalLight.transform.rotation = Quaternion.LookRotation(dir);
                }

                if (!string.IsNullOrEmpty(lighting.ambientColor) && ColorUtility.TryParseHtmlString(lighting.ambientColor, out Color color))
                {
                    mainDirectionalLight.color = color;
                    RenderSettings.ambientLight = color;
                }
            }
        }
    }

    public class SurfaceManager : MonoBehaviour
    {
        private List<SurfaceDTO> detectedSurfaces = new List<SurfaceDTO>();

        public void UpdateSurfaces(List<SurfaceDTO> surfaces)
        {
            detectedSurfaces = surfaces ?? new List<SurfaceDTO>();
        }

        public Vector3 GetSurfacePosition(string type)
        {
            var found = detectedSurfaces.Find(s => s.type == type);
            return found != null ? found.position : Vector3.zero;
        }
    }
}
